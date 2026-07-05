import logging
from uuid import uuid4

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from pydantic import BaseModel

from personas import get_persona
from services.gemini_service import generate_response
from services.stt_service import transcribe_audio
from services.tts_service import synthesize_speech, save_character, saved_characters

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ─── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Hikawi API — حكاوي",
    description="Interactive Egyptian Oral Heritage Chatbot API",
    version="1.0.0",
)

# CORS — allow everything for local hackathon demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ─── In-Memory Conversation Store ─────────────────────────────────────────────

# Key: session_id (UUID string)
# Value: list of {"role": "user"/"model", "parts": [{"text": "..."}]}
conversation_history: dict[str, list[dict]] = {}

# ─── Pydantic Models ──────────────────────────────────────────────────────────


class TextChatRequest(BaseModel):
    text: str
    session_id: str | None = None


class TextChatResponse(BaseModel):
    response: str
    session_id: str


class AudioChatResponse(BaseModel):
    transcribed_text: str
    response: str
    session_id: str


class TTSRequest(BaseModel):
    text: str
    character_name: str | None = None


# ─── Endpoints ─────────────────────────────────────────────────────────────────





@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "hikawi"}


@app.post("/api/chat/text", response_model=TextChatResponse)
async def chat_text(request: TextChatRequest):
    """
    Text chat with the Aswan regional persona.

    Sends the user's text to Gemini 2.5 Flash with the Aswan persona
    system prompt and returns a response in Sa'idi/Nubian dialect.
    """
    try:
        # Generate or use existing session ID
        session_id = request.session_id or str(uuid4())

        # Get Aswan persona
        persona = get_persona("aswan")

        # Get or create conversation history
        history = conversation_history.setdefault(session_id, [])

        # Generate response from Gemini
        ai_response = generate_response(
            user_text=request.text,
            system_prompt=persona["system_prompt"],
            history=history,
        )

        # Update conversation history
        history.append({"role": "user", "parts": [{"text": request.text}]})
        history.append({"role": "model", "parts": [{"text": ai_response}]})

        logger.info(f"Text chat | session={session_id[:8]}... | user={request.text[:30]}...")

        return TextChatResponse(response=ai_response, session_id=session_id)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in chat_text: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Transcribe audio to text only (no AI response).
    Returns the transcribed text for user review before sending.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        filename = file.filename or "recording.webm"
        transcribed_text = transcribe_audio(audio_bytes, filename)

        if not transcribed_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe any text from the audio",
            )

        return {"text": transcribed_text.strip()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

@app.post("/api/chat/audio", response_model=AudioChatResponse)
async def chat_audio(
    file: UploadFile = File(...),
    session_id: str = Form(default=None),
):
    """
    Audio chat with the Aswan regional persona.

    Receives an audio file (WebM/OGG/WAV), transcribes it via Speechmatics,
    then sends the transcribed text to Gemini for a persona response.
    """
    try:
        # Read audio bytes
        audio_bytes = await file.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        # Transcribe audio to text
        filename = file.filename or "recording.webm"
        transcribed_text = transcribe_audio(audio_bytes, filename)

        if not transcribed_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe any text from the audio",
            )

        # Generate or use existing session ID
        session_id = session_id or str(uuid4())

        # Get Aswan persona
        persona = get_persona("aswan")

        # Get or create conversation history
        history = conversation_history.setdefault(session_id, [])

        # Generate response from Gemini
        ai_response = generate_response(
            user_text=transcribed_text,
            system_prompt=persona["system_prompt"],
            history=history,
        )

        # Update conversation history
        history.append({"role": "user", "parts": [{"text": transcribed_text}]})
        history.append({"role": "model", "parts": [{"text": ai_response}]})

        logger.info(
            f"Audio chat | session={session_id[:8]}... | "
            f"transcribed={transcribed_text[:30]}..."
        )

        return AudioChatResponse(
            transcribed_text=transcribed_text,
            response=ai_response,
            session_id=session_id,
        )

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in chat_audio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Gradio TTS API.

    Returns the generated audio file for playback in the browser.
    """
    try:
        # Call Gradio TTS API
        filepath, error = synthesize_speech(
            text=request.text,
            character_name=request.character_name,
        )

        if error:
            logger.error(f"TTS error: {error}")
            raise HTTPException(status_code=500, detail=error)

        # Return the audio file
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


# ─── Character Management ──────────────────────────────────────────────────────


@app.post("/api/characters/add")
async def add_character(
    char_name: str = Form(...),
    ref_text: str = Form(...),
    audio_file: UploadFile = File(...),
):
    """
    Save a new voice character to the Gradio TTS model.

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
        import os
        import json
        char_dir = os.path.join("data", "characters")
        os.makedirs(char_dir, exist_ok=True)
        
        safe_char_name = char_name.strip().replace(" ", "_")
        local_audio_path = os.path.join(char_dir, f"{safe_char_name}.webm")
        
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
            "ref_audio_path": local_audio_path
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


@app.get("/api/characters")
async def list_characters():
    """List all saved voice characters."""
    return {"characters": saved_characters}


# ─── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
