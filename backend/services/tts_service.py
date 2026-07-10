import logging
import os
import tempfile
import base64
import requests
import json

from config import settings

logger = logging.getLogger(__name__)

# Track saved characters
saved_characters: list[str] = []

def get_api_url() -> str:
    url = settings.VOICE_API_URL
    if not url.endswith('/'):
        url += '/'
    return url

def save_character(
    char_name: str,
    audio_bytes: bytes,
    audio_filename: str,
    ref_text: str,
) -> tuple[str, None] | tuple[None, str]:
    """
    Save a new character voice to the Lightning TTS model via REST API.
    """
    try:
        url = get_api_url()
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        payload = {
            "action": "save_character",
            "char_name": char_name,
            "audio_prompt": audio_b64,
            "ref_text": ref_text
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
        else:
            err_msg = data.get("message", "Unknown error")
            logger.error(f"Failed to save character {char_name}: {err_msg}")
            return None, err_msg
            
    except Exception as e:
        logger.error(f"Failed to save character via API: {e}")
        return None, f"Failed to save character: {e}"


def synthesize_speech(text: str, character_name: str) -> tuple[str, None] | tuple[None, str]:
    """
    Synthesize speech using the Lightning TTS API.
    """
    try:
        from personas import get_persona_by_character_name
        
        ref_path = None
        ref_text = None
        
        # We always try to load the reference audio to pass in the payload if needed
        persona = get_persona_by_character_name(character_name)
        if persona and "ref_audio_path" in persona and "ref_text" in persona:
            ref_path = persona["ref_audio_path"]
            ref_text = persona["ref_text"]
        else:
            registry_path = os.path.join("data", "characters", "registry.json")
            if os.path.exists(registry_path):
                with open(registry_path, "r", encoding="utf-8") as f:
                    try:
                        registry = json.load(f)
                        if character_name in registry:
                            ref_path = registry[character_name].get("ref_audio_path")
                            ref_text = registry[character_name].get("ref_text")
                    except Exception as e:
                        logger.error(f"Error reading registry.json: {e}")

        # If it's not saved yet, we'll try to explicitly save it just in case
        if character_name and character_name not in saved_characters:
            if ref_path and ref_text and os.path.exists(ref_path):
                logger.info(f"Character '{character_name}' not in saved_characters. Saving first.")
                with open(ref_path, "rb") as f:
                    audio_bytes = f.read()
                msg, err = save_character(
                    char_name=character_name,
                    audio_bytes=audio_bytes,
                    audio_filename=os.path.basename(ref_path),
                    ref_text=ref_text,
                )
                if err:
                    logger.error(f"Lazy load failed for {character_name}: {err}")
            else:
                logger.warning(f"No reference info found for character {character_name}")

        audio_b64 = ""
        if ref_path and ref_text and os.path.exists(ref_path):
            with open(ref_path, "rb") as f:
                audio_b64 = base64.b64encode(f.read()).decode('utf-8')
                
        url = get_api_url()
        payload = {
            "action": "generate",
            "text": text,
            "char_name": character_name
        }
        
        if audio_b64:
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
                
            # Write out to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                tmp.write(base64.b64decode(audio_base64))
                logger.info(f"TTS audio generated: {tmp.name}")
                return tmp.name, None
        else:
            err_msg = data.get("message", "Unknown error")
            logger.error(f"API TTS generation failed: {err_msg}")
            return None, err_msg

    except Exception as e:
        logger.error(f"API TTS error: {e}")
        return None, f"API TTS failed: {e}"
