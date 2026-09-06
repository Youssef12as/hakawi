import json
import logging
import os

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from src.characters.schemas import TTSRequest
from src.characters.service import (
    save_character,
    saved_characters,
    synthesize_speech,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["characters"])


@router.post("/api/tts")
def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using the Lahgtna / Lightning TTS API.

    Returns the generated audio file for playback in the browser.
    """
    try:
        filepath, error = synthesize_speech(
            text=request.text,
            character_name=request.character_name,
        )

        if error:
            logger.error(f"TTS error: {error}")
            raise HTTPException(status_code=500, detail=error)

        return FileResponse(
            filepath,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "no-cache",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in TTS: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/api/characters/add")
async def add_character(
    char_name: str = Form(...),
    ref_text: str = Form(...),
    audio_file: UploadFile = File(...),
):
    """
    Save a new voice character to the Lightning TTS model.

    Requires: character name, reference audio clip, and the text spoken in that clip.
    """
    try:
        if not char_name.strip():
            raise HTTPException(status_code=400, detail="Character name is required")
        if not ref_text.strip():
            raise HTTPException(status_code=400, detail="Reference text is required")

        audio_bytes = await audio_file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        filename = audio_file.filename or "reference.wav"

        # --- Save character permanently for lazy loading ---
        char_dir = os.path.join("data", "characters")
        os.makedirs(char_dir, exist_ok=True)

        safe_char_name = char_name.strip().replace(" ", "_")
        local_audio_path = os.path.join(char_dir, f"{safe_char_name}.wav")

        with open(local_audio_path, "wb") as f:
            f.write(audio_bytes)

        registry_path = os.path.join(char_dir, "registry.json")
        registry = {}
        if os.path.exists(registry_path):
            with open(registry_path, "r", encoding="utf-8") as f:
                try:
                    registry = json.load(f)
                except json.JSONDecodeError:
                    pass

        registry[char_name.strip()] = {
            "ref_text": ref_text.strip(),
            "ref_audio_path": local_audio_path,
        }

        with open(registry_path, "w", encoding="utf-8") as f:
            json.dump(registry, f, ensure_ascii=False, indent=2)
        # ---------------------------------------------------

        message, error = save_character(
            char_name=char_name.strip(),
            audio_bytes=audio_bytes,
            audio_filename=filename,
            ref_text=ref_text.strip(),
        )

        if error:
            logger.error(f"Save character error: {error}")
            raise HTTPException(status_code=500, detail=error)

        return {"message": message, "character_name": char_name.strip()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error saving character: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/api/characters")
async def list_characters():
    """List all saved voice characters."""
    return {"characters": saved_characters}


@router.get("/api/registry")
async def get_registry():
    """Get all characters directly from the JSON registry file."""
    registry_path = os.path.join("data", "characters", "registry.json")
    if os.path.exists(registry_path):
        try:
            with open(registry_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading registry.json: {e}")
    return {}
