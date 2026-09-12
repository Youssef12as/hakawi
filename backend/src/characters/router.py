import json
import logging
import os

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from src.characters.constants import CHARACTERS_AUDIO_DIR
from src.characters.schemas import TTSRequest
from src.characters.service import (
    save_character,
    synthesize_speech,
)
from src.characters.utils import sanitize_character_name

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
    request: Request,
    char_name: str = Form(...),
    ref_text: str = Form(...),
    audio_file: UploadFile = File(...),
):
    """
    Save a new voice character to Supabase voice_personas table.
    Optionally registers the voice with the Lightning TTS model (non-blocking).
    """
    try:
        from src.auth import get_optional_user_id
        user_id = get_optional_user_id(request)

        if not char_name.strip():
            raise HTTPException(status_code=400, detail="Character name is required")
        if not ref_text.strip():
            raise HTTPException(status_code=400, detail="Reference text is required")

        audio_bytes = await audio_file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        safe_char_name = char_name.strip().replace(" ", "_")

        # Save audio file to disk (needed for local TTS caching)
        char_dir = os.path.join("data", "characters")
        os.makedirs(char_dir, exist_ok=True)
        local_audio_path = os.path.join(char_dir, f"{safe_char_name}.wav")
        with open(local_audio_path, "wb") as f:
            f.write(audio_bytes)

        # Upload audio file to Supabase Storage bucket 'characters'
        storage_audio_url = local_audio_path
        try:
            import requests
            from src.config import settings
            supabase_url = settings.SUPABASE_URL
            anon_key = settings.SUPABASE_ANON_KEY
            if supabase_url and anon_key:
                upload_url = f"{supabase_url}/storage/v1/object/characters/audios/{safe_char_name}.wav"
                res = requests.post(
                    upload_url,
                    headers={"Authorization": f"Bearer {anon_key}", "Content-Type": "audio/wav", "x-upsert": "true"},
                    data=audio_bytes,
                    timeout=10,
                )
                if res.status_code in (200, 201):
                    storage_audio_url = f"{supabase_url}/storage/v1/object/public/characters/audios/{safe_char_name}.wav"
                    logger.info(f"Character audio uploaded to Supabase Storage: {storage_audio_url}")
        except Exception as upload_err:
            logger.warning(f"Could not upload character audio to Supabase Storage: {upload_err}")

        # Save to Supabase voice_personas table
        from src.database import get_db_cursor
        with get_db_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO public.voice_personas (key, name, ref_audio_path, ref_text, user_id, is_custom)
                VALUES (%s, %s, %s, %s, %s, true)
                ON CONFLICT (key) DO UPDATE SET
                    name = EXCLUDED.name,
                    ref_audio_path = EXCLUDED.ref_audio_path,
                    ref_text = EXCLUDED.ref_text,
                    user_id = COALESCE(EXCLUDED.user_id, public.voice_personas.user_id),
                    is_custom = true;
                """,
                (safe_char_name, char_name.strip(), storage_audio_url, ref_text.strip(), user_id)
            )

        logger.info(f"Character '{char_name}' saved to Supabase voice_personas (cloning deferred to first generation).")

        return {
            "message": "Character saved successfully. Voice will clone on first generation.",
            "character_name": safe_char_name,
            "ref_audio_path": storage_audio_url,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error saving character: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save character: {e}")


@router.get("/api/characters")
async def list_characters():
    """List all saved voice characters from Supabase."""
    from src.database import get_db_cursor
    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT key, name, is_custom FROM public.voice_personas ORDER BY key;")
            rows = cur.fetchall()
        return {"characters": [r["key"] for r in rows]}
    except Exception as e:
        logger.error(f"Error listing characters from Supabase: {e}")
        return {"characters": []}


@router.get("/api/registry")
async def get_registry():
    """Get all characters from Supabase voice_personas table."""
    from src.database import get_db_cursor
    try:
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT key, name, ref_audio_path, ref_text, is_custom,
                       idle_video_url, talking_video_url, avatar_url
                FROM public.voice_personas 
                ORDER BY key;
                """
            )
            rows = cur.fetchall()
        return {
            r["key"]: {
                "name": r["name"],
                "ref_audio_path": r["ref_audio_path"],
                "ref_text": r["ref_text"],
                "is_custom": r.get("is_custom", False),
                "idle_video_url": r.get("idle_video_url"),
                "talking_video_url": r.get("talking_video_url"),
                "avatar_url": r.get("avatar_url"),
            }
            for r in rows
        }
    except Exception as e:
        logger.error(f"Error reading voice_personas from Supabase: {e}")
        return {}

