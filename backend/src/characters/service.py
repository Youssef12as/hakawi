import logging
import os
import tempfile
import base64
import requests

from src.characters.constants import DEFAULT_VOICE
from src.characters.utils import resolve_character_ref, sanitize_character_name
from src.config import settings

logger = logging.getLogger(__name__)


def get_api_url() -> str:
    url = settings.VOICE_API_URL
    if not url.endswith('/'):
        url += '/'
    return url


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
    """
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
            return message, None

        err_msg = data.get("message", "Unknown error")
        logger.error(f"Failed to save character {char_name}: {err_msg}")
        return None, err_msg

    except Exception as e:
        logger.error(f"Failed to save character via API: {e}")
        return None, f"Failed to save character: {e}"


def _build_generate_payload(text: str, character_name: str, include_ref: bool = False) -> dict:
    """Build the JSON payload for a TTS generate request."""
    payload = {
        "action": "generate",
        "text": text,
        "char_name": character_name,
    }

    if include_ref:
        ref_path, ref_text = _resolve_character_ref(character_name)
        if ref_path and ref_text:
            audio_bytes = _get_audio_bytes(ref_path)
            if audio_bytes:
                payload["audio_prompt"] = base64.b64encode(audio_bytes).decode('utf-8')
                payload["ref_text"] = ref_text

    return payload


def synthesize_speech(text: str, character_name: str) -> tuple[str, None] | tuple[None, str]:
    """
    Synthesize speech using the Lightning TTS API.

    Sends a lightweight generate request. If the Lightning server reports the
    character is not found (e.g. after a server restart), retries once with
    the reference audio and text attached inline so the server can auto-save
    and generate in one roundtrip.
    """
    try:
        url = get_api_url()

        # 1. Try a lightweight generate (no reference audio attached)
        payload = _build_generate_payload(text, character_name, include_ref=False)

        logger.info(f"Requesting TTS generation for character '{character_name}', text: '{text[:20]}...'")
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()

        data = response.json()

        # 2. If character not found on Lightning, retry with inline reference audio
        if data.get("status") == "error" and "not found" in data.get("message", "").lower():
            logger.info(f"Character '{character_name}' not on Lightning server — retrying with inline reference audio.")
            payload = _build_generate_payload(text, character_name, include_ref=True)
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
