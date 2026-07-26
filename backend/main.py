import json
import logging
import os
from collections import OrderedDict
from uuid import uuid4

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from pydantic import BaseModel

from personas import get_persona
from monuments_registry import get_all_governorates, get_monument_by_key
from services.gemini_service import generate_response, generate_rag_response
from services.rag_service import is_ready as rag_is_ready, retrieve_and_build
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
    version="1.1.0",
)

# CORS — allow everything for local hackathon demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── In-Memory Conversation Store (with simple LRU cap) ──────────────────────
# Key:   session_id (UUID string)
# Value: list of {"role": "user"/"model", "parts": [{"text": "..."}]}
#
# Without eviction this dict grows forever in a long-running demo.  Cap it
# at a few hundred sessions and evict oldest-first when full.
MAX_SESSIONS = 256
conversation_history: "OrderedDict[str, list[dict]]" = OrderedDict()


def get_history(session_id: str) -> list[dict]:
    """Get (or create) the conversation history for a session, marking it MRU."""
    if session_id not in conversation_history:
        conversation_history[session_id] = []
        while len(conversation_history) > MAX_SESSIONS:
            conversation_history.popitem(last=False)
    else:
        conversation_history.move_to_end(session_id)
    return conversation_history[session_id]


# ─── Pydantic Models ──────────────────────────────────────────────────────────


class TextChatRequest(BaseModel):
    text: str
    session_id: str | None = None
    # Region is optional so the existing frontend payload keeps working.
    # Defaults to "aswan" for backwards compatibility.
    region: str = "aswan"


class TextChatResponse(BaseModel):
    response: str
    session_id: str
    region: str


class AudioChatResponse(BaseModel):
    transcribed_text: str
    response: str
    session_id: str
    region: str


class TTSRequest(BaseModel):
    text: str
    character_name: str | None = None


class AncientChatRequest(BaseModel):
    text: str
    session_id: str | None = None
    top_k: int = 4
    # Optional monument key (e.g. "abu-simbel") from the monuments registry.
    # When set, the RAG search is constrained to that monument's chunks and
    # the persona is resolved directly from the registry instead of being
    # fuzzy-matched from the top chunk.
    monument_key: str | None = None


class AncientChatResponse(BaseModel):
    response: str
    session_id: str
    monument: str
    builder: str
    persona_key: str
    display_name: str
    character_name: str


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "hikawi",
        "rag_ready": rag_is_ready(),
    }


@app.get("/api/governorates")
async def list_governorates():
    """
    Return all governorates with their monuments nested.

    Each monument includes: key, display_name, builder, title, bio, lat,
    lng, character_name (TTS voice id, currently "am-othman" for all),
    chips (suggested quick-reply questions), and monument_name (the exact
    key used to filter RAG chunks).
    """
    return {"governorates": get_all_governorates()}


@app.post("/api/chat/text", response_model=TextChatResponse)
async def chat_text(request: TextChatRequest):
    """
    Text chat with a regional persona.

    Sends the user's text to Gemini with the selected region's persona
    system prompt and returns a response in the matching dialect.
    """
    try:
        session_id = request.session_id or str(uuid4())
        persona = get_persona(request.region)
        history = get_history(session_id)

        ai_response = generate_response(
            user_text=request.text,
            system_prompt=persona["system_prompt"],
            history=history,
        )

        history.append({"role": "user", "parts": [{"text": request.text}]})
        history.append({"role": "model", "parts": [{"text": ai_response}]})

        logger.info(
            "Text chat | session=%s... | region=%s | user=%s...",
            session_id[:8], request.region, request.text[:30],
        )

        return TextChatResponse(
            response=ai_response,
            session_id=session_id,
            region=request.region,
        )

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
    region: str = Form(default="aswan"),
):
    """
    Audio chat with a regional persona.

    Receives an audio file (WebM/OGG/WAV), transcribes it via Speechmatics,
    then sends the transcribed text to Gemini for a persona response.
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

        session_id = session_id or str(uuid4())
        persona = get_persona(region)
        history = get_history(session_id)

        ai_response = generate_response(
            user_text=transcribed_text,
            system_prompt=persona["system_prompt"],
            history=history,
        )

        history.append({"role": "user", "parts": [{"text": transcribed_text}]})
        history.append({"role": "model", "parts": [{"text": ai_response}]})

        logger.info(
            "Audio chat | session=%s... | region=%s | transcribed=%s...",
            session_id[:8], region, transcribed_text[:30],
        )

        return AudioChatResponse(
            transcribed_text=transcribed_text,
            response=ai_response,
            session_id=session_id,
            region=region,
        )

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in chat_audio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/chat/ancient", response_model=AncientChatResponse)
async def chat_ancient(request: AncientChatRequest):
    """
    RAG-backed chat with a historical character (Ancient Mode).

    Pipeline:
        user question
          → Gemini embedding
          → cosine-similarity search over embeddings.json
            (constrained to the selected monument when monument_key is set)
          → pick the historical persona for that monument
          → assemble strict anti-hallucination prompt
          → Gemini 2.5 Flash (low temperature)
          → Arabic reply in character

    When `monument_key` is provided, the response also includes
    `display_name` and `character_name` (TTS voice id) from the monuments
    registry so the frontend knows which voice/video to use.
    """
    try:
        if not rag_is_ready():
            raise HTTPException(
                status_code=503,
                detail="خدمة الـ RAG غير جاهزة. تأكد من وجود ملف embeddings.json.",
            )

        session_id = request.session_id or str(uuid4())

        # Resolve monument filter from the registry (if provided)
        monument_name_filter: str | None = None
        display_name = ""
        character_name = "am-othman"
        if request.monument_key:
            entry = get_monument_by_key(request.monument_key)
            if entry is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Monument '{request.monument_key}' not found in registry.",
                )
            monument_name_filter = entry["monument_name"]
            display_name = entry["display_name"]
            character_name = entry.get("character_name", "am-othman")

        payload = retrieve_and_build(
            request.text,
            top_k=request.top_k,
            monument_name=monument_name_filter,
        )

        ai_response = generate_rag_response(
            user_prompt=payload["user_prompt"],
            system_prompt=payload["system_prompt"],
        )

        # If the monument was explicitly selected, prefer the registry's
        # display_name and builder over the fuzzy-matched ones.
        if request.monument_key:
            builder = payload["builder"] or display_name
        else:
            builder = payload["builder"]

        logger.info(
            "Ancient chat | session=%s... | monument=%s | builder=%s | user=%s...",
            session_id[:8], payload["monument"][:30],
            builder[:20], request.text[:30],
        )

        return AncientChatResponse(
            response=ai_response,
            session_id=session_id,
            monument=payload["monument"],
            builder=builder,
            persona_key=payload["persona_key"],
            display_name=display_name,
            character_name=character_name,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in chat_ancient: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/tts")
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


# ─── Character Management ──────────────────────────────────────────────────────


@app.post("/api/characters/add")
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


@app.get("/api/characters")
async def list_characters():
    """List all saved voice characters."""
    return {"characters": saved_characters}


# ─── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
