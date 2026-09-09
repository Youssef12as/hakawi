import logging
import os
import tempfile
import base64
import requests
import json

from src.characters.constants import DEFAULT_VOICE
from src.characters.utils import resolve_character_ref, sanitize_character_name
from src.config import settings

logger = logging.getLogger(__name__)


# Pre-populate saved characters from Supabase so we don't re-clone them on the TTS model.
def _load_saved_characters() -> set[str]:
    """Load characters that are already registered/cloned in the TTS model."""
    chars: set[str] = set()
    try:
        from src.database import get_db_cursor
        with get_db_cursor() as cur:
            cur.execute("SELECT key FROM public.voice_personas WHERE is_cloned = true OR is_custom = false;")
            rows = cur.fetchall()
            for r in rows:
                chars.add(r["key"])
    except Exception as e:
        logger.warning(f"Could not load cloned characters from Supabase: {e}")

    return chars


# Characters successfully registered with the TTS API (in-memory cache)
saved_characters: set[str] = _load_saved_characters()
# In-flight save requests — prevents duplicate clone calls under concurrency
_pending_saves: set[str] = set()


def is_character_saved(character_name: str) -> bool:
    """Check if character is already cloned/saved in the TTS model."""
    if not character_name:
        return False

    # Check in-memory set (fast path)
    if character_name in saved_characters:
        return True

    safe_name = sanitize_character_name(character_name)
    if safe_name in saved_characters:
        return True

    # Check Supabase voice_personas table
    try:
        from src.database import get_db_cursor
        with get_db_cursor() as cur:
            cur.execute(
                "SELECT key, is_cloned, is_custom FROM public.voice_personas WHERE key = %s OR key = %s;",
                (character_name, safe_name)
            )
            row = cur.fetchone()
            if row:
                # Built-in (not custom) or already cloned custom
                if not row.get("is_custom") or row.get("is_cloned"):
                    saved_characters.add(character_name)
                    saved_characters.add(row["key"])
                    return True
    except Exception as e:
        logger.error(f"Error checking if character '{character_name}' is saved: {e}")

    return False


def get_api_url() -> str:
    url = settings.VOICE_API_URL
    if not url.endswith('/'):
        url += '/'
    return url


def _resolve_character_ref(character_name: str) -> tuple[str | None, str | None]:
    """Resolve a character's reference audio path and text from Supabase."""
    return resolve_character_ref(character_name)



def save_character(
    char_name: str,
    audio_bytes: bytes,
    audio_filename: str,
    ref_text: str,
) -> tuple[str, None] | tuple[None, str]:
    """
    Save/clone a new character voice to the Lightning TTS model via REST API.
    Skips the API call if the character is already saved or a save is in progress.
    """
    if is_character_saved(char_name):
        logger.info(f"Character '{char_name}' already saved — skipping clone request.")
        return "Already saved", None

    if char_name in _pending_saves:
        logger.info(f"Character '{char_name}' save already in progress — skipping duplicate.")
        return "Save in progress", None

    _pending_saves.add(char_name)
    try:
        url = get_api_url()
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')

        payload = {
            "action": "save_character",
            "char_name": char_name,
            "audio_prompt": audio_b64,
            "ref_text": ref_text,
        }

        logger.info(f"Saving character {char_name} to {url}...")
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        response.raise_for_status()

        data = response.json()
        if data.get("status") == "success":
            message = data.get("message", "Success")
            logger.info(f"Character saved: {char_name} — {message}")
            saved_characters.add(char_name)

            # Mark as cloned in Supabase voice_personas
            safe_name = char_name.strip().replace(" ", "_")
            try:
                from src.database import get_db_cursor
                with get_db_cursor(commit=True) as cur:
                    cur.execute(
                        "UPDATE public.voice_personas SET is_cloned = true WHERE key = %s OR key = %s;",
                        (char_name, safe_name)
                    )
            except Exception as db_err:
                logger.error(f"Error updating is_cloned in Supabase: {db_err}")

            return message, None

        err_msg = data.get("message", "Unknown error")
        logger.error(f"Failed to save character {char_name}: {err_msg}")
        return None, err_msg

    except Exception as e:
        logger.error(f"Failed to save character via API: {e}")
        return None, f"Failed to save character: {e}"
    finally:
        _pending_saves.discard(char_name)


def _get_audio_bytes(ref_path: str) -> bytes | None:
    """Fetch audio bytes from Supabase Storage URL or local file path."""
    if not ref_path:
        return None
    if ref_path.startswith("http://") or ref_path.startswith("https://"):
        fname = os.path.basename(ref_path.split("?")[0])
        local_cache = os.path.join("data", "characters", fname)
        if os.path.exists(local_cache):
            try:
                with open(local_cache, "rb") as f:
                    return f.read()
            except Exception:
                pass
        try:
            resp = requests.get(ref_path, timeout=10)
            if resp.status_code == 200:
                return resp.content
        except Exception as e:
            logger.error(f"Failed to fetch audio from URL {ref_path}: {e}")
            return None
    elif os.path.exists(ref_path):
        try:
            with open(ref_path, "rb") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to read local audio {ref_path}: {e}")
            return None
    return None


def _ensure_character_saved(character_name: str) -> None:
    """Lazy-register/clone a character once; no-op if already saved or saving."""
    if not character_name or is_character_saved(character_name):
        return

    if character_name in _pending_saves:
        return

    ref_path, ref_text = _resolve_character_ref(character_name)
    if not ref_path or not ref_text:
        logger.warning(f"No reference info found for character {character_name}")
        return

    audio_bytes = _get_audio_bytes(ref_path)
    if not audio_bytes:
        logger.warning(f"Could not load reference audio for character {character_name} from {ref_path}")
        return

    logger.info(f"Character '{character_name}' not saved yet — cloning voice now.")
    _, err = save_character(
        char_name=character_name,
        audio_bytes=audio_bytes,
        audio_filename=os.path.basename(ref_path.split("?")[0]),
        ref_text=ref_text,
    )
    if err:
        logger.error(f"Lazy clone failed for {character_name}: {err}")


def synthesize_speech(text: str, character_name: str) -> tuple[str, None] | tuple[None, str]:
    """
    Synthesize speech using the Lightning TTS API.
    First checks if the character is already saved:
      - If already saved: DO NOT clone, just generate.
      - If not saved: clones on first generation, then generates.
    """
    try:
        url = get_api_url()

        # 1. First check if character is already saved
        if is_character_saved(character_name):
            logger.info(f"Character '{character_name}' is already saved — skipping clone, generating speech directly.")
        else:
            logger.info(f"Character '{character_name}' not saved yet — cloning on first generation.")
            _ensure_character_saved(character_name)

        # 2. Build generate payload
        payload = {
            "action": "generate",
            "text": text,
            "char_name": character_name,
        }

        # 3. Only attach reference audio if character is still not registered
        if not is_character_saved(character_name):
            ref_path, ref_text = _resolve_character_ref(character_name)
            if ref_path and ref_text:
                audio_bytes = _get_audio_bytes(ref_path)
                if audio_bytes:
                    payload["audio_prompt"] = base64.b64encode(audio_bytes).decode('utf-8')
                    payload["ref_text"] = ref_text

        logger.info(f"Requesting TTS generation for character '{character_name}', text: '{text[:20]}...'")
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()

        data = response.json()
        if data.get("status") == "success":
            audio_base64 = data.get("audio_base64")
            if not audio_base64:
                return None, "API returned success but no audio_base64"

            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                tmp.write(base64.b64decode(audio_base64))
                logger.info(f"TTS audio generated: {tmp.name}")
                return tmp.name, None

        err_msg = data.get("message", "Unknown error")
        logger.error(f"API TTS generation failed: {err_msg}")
        return None, err_msg

    except Exception as e:
        logger.error(f"API TTS error: {e}")
        return None, f"API TTS failed: {e}"
