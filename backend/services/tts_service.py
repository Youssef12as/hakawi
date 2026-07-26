import logging
import os
import tempfile
import base64
import requests
import json

from config import settings

logger = logging.getLogger(__name__)

# Pre-populate saved characters from the on-disk registry so we don't
# re-save them to the TTS model on every server restart.
def _load_saved_characters() -> list[str]:
    """Read character names from the local registry and built-in voices."""
    names: list[str] = []
    # 1. From the local characters registry
    registry_path = os.path.join("data", "characters", "registry.json")
    if os.path.exists(registry_path):
        try:
            with open(registry_path, "r", encoding="utf-8") as f:
                registry = json.load(f)
                names.extend(registry.keys())
        except Exception:
            pass
    # 2. From the built-in voices (e.g. am-othman)
    try:
        from personas import list_voices
        for vname in list_voices():
            if vname not in names:
                names.append(vname)
    except Exception:
        pass
    return names

# Characters successfully registered with the TTS API (in-memory for this process)
saved_characters: list[str] = _load_saved_characters()
# In-flight save requests — prevents duplicate clone calls under concurrency
_pending_saves: set[str] = set()

def get_api_url() -> str:
    url = settings.VOICE_API_URL
    if not url.endswith('/'):
        url += '/'
    return url


def _resolve_character_ref(character_name: str) -> tuple[str | None, str | None]:
    """Resolve a character's reference audio path and text.

    Lookup order:
        1. VOICES dict in personas.py (primary source)
        2. data/characters/registry.json (runtime-added characters)
    """
    from personas import get_voice

    voice = get_voice(character_name)
    if voice and voice.get("ref_audio_path") and voice.get("ref_text"):
        return voice["ref_audio_path"], voice["ref_text"]

    # Fallback: check the runtime registry
    registry_path = os.path.join("data", "characters", "registry.json")
    if os.path.exists(registry_path):
        with open(registry_path, "r", encoding="utf-8") as f:
            try:
                registry = json.load(f)
                if character_name in registry:
                    entry = registry[character_name]
                    return entry.get("ref_audio_path"), entry.get("ref_text")
            except Exception as e:
                logger.error(f"Error reading registry.json: {e}")

    return None, None


def save_character(
    char_name: str,
    audio_bytes: bytes,
    audio_filename: str,
    ref_text: str,
) -> tuple[str, None] | tuple[None, str]:
    """
    Save a new character voice to the Lightning TTS model via REST API.
    Skips the API call if the character is already saved or a save is in progress.
    """
    if char_name in saved_characters:
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
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()

        data = response.json()
        if data.get("status") == "success":
            message = data.get("message", "Success")
            logger.info(f"Character saved: {char_name} — {message}")
            if char_name not in saved_characters:
                saved_characters.append(char_name)
            return message, None

        err_msg = data.get("message", "Unknown error")
        logger.error(f"Failed to save character {char_name}: {err_msg}")
        return None, err_msg

    except Exception as e:
        logger.error(f"Failed to save character via API: {e}")
        return None, f"Failed to save character: {e}"
    finally:
        _pending_saves.discard(char_name)


def _ensure_character_saved(character_name: str) -> None:
    """Lazy-register a character once; no-op if already saved or saving."""
    if not character_name or character_name in saved_characters:
        return

    if character_name in _pending_saves:
        return

    ref_path, ref_text = _resolve_character_ref(character_name)
    if not ref_path or not ref_text or not os.path.exists(ref_path):
        logger.warning(f"No reference info found for character {character_name}")
        return

    logger.info(f"Character '{character_name}' not saved yet — registering voice.")
    with open(ref_path, "rb") as f:
        audio_bytes = f.read()

    _, err = save_character(
        char_name=character_name,
        audio_bytes=audio_bytes,
        audio_filename=os.path.basename(ref_path),
        ref_text=ref_text,
    )
    if err:
        logger.error(f"Lazy load failed for {character_name}: {err}")


def synthesize_speech(text: str, character_name: str) -> tuple[str, None] | tuple[None, str]:
    """
    Synthesize speech using the Lightning TTS API.
    Reuses saved character voices — reference audio is sent only when not yet registered.
    """
    try:
        _ensure_character_saved(character_name)

        url = get_api_url()
        payload = {
            "action": "generate",
            "text": text,
            "char_name": character_name,
        }

        # Only attach reference audio on first generate before clone succeeds
        if character_name not in saved_characters:
            ref_path, ref_text = _resolve_character_ref(character_name)
            if ref_path and ref_text and os.path.exists(ref_path):
                with open(ref_path, "rb") as f:
                    audio_b64 = base64.b64encode(f.read()).decode('utf-8')
                payload["audio_prompt"] = audio_b64
                payload["ref_text"] = ref_text

        logger.info(f"Requesting TTS generation for text: '{text[:20]}...'")
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
