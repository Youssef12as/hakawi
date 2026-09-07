import logging
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket

from src.config import settings
from src.chat.ancient_translation import generate_with_ancient
from src.chat.rag_service import is_ready as rag_is_ready, retrieve_and_build
from src.chat.schemas import (
    AncientChatRequest,
    AncientChatResponse,
    AudioChatResponse,
    ChatHistoryResponse,
    TextChatRequest,
    TextChatResponse,
)
from src.chat.service import (
    clean_text_formatting,
    get_history,
    get_recent_session_history,
    get_session_messages,
    save_chat_turn,
)
from src.chat.utils import format_persona_instructions, get_historical_persona
from src.family.utils import build_family_prompt
from src.governorates.utils import get_monument_by_key
from src.integrations.gemini import generate
from src.integrations.speechmatics import transcribe_audio as transcribe_audio_speechmatics
from src.integrations.deepgram import (
    proxy_deepgram_ws,
    transcribe_audio_deepgram,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


def _transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """
    Transcribe audio with Deepgram Nova-3 as primary and Speechmatics as fallback.
    """
    if settings.DEEPGRAM_API_KEY:
        try:
            text = transcribe_audio_deepgram(audio_bytes, filename)
            if text:
                return text
        except Exception as e:
            logger.warning(f"Deepgram transcription failed, trying Speechmatics fallback: {e}")

    if settings.SPEECHMATICS_API_KEY:
        return transcribe_audio_speechmatics(audio_bytes, filename)

    raise RuntimeError("No transcription service available (neither Deepgram nor Speechmatics configured).")


@router.websocket("/api/ws/stt")
async def websocket_stt_endpoint(websocket: WebSocket):
    """
    Live streaming speech-to-text WebSocket proxy to Deepgram Nova-3.
    """
    await websocket.accept()
    await proxy_deepgram_ws(websocket)


@router.post("/api/chat/text", response_model=TextChatResponse)
async def chat_text(request: TextChatRequest):
    """
    Text chat with a regional persona.

    Sends the user's text to Gemini with the selected region's persona
    system prompt and returns a response in the matching dialect.
    """
    try:
        session_id = request.session_id or str(uuid4())
        history = get_history(session_id)

        # Family member mode: use relation-based persona
        if request.persona == "family_member" and request.member_name:
            system_prompt = build_family_prompt(request.member_name, request.relation)
        else:
            persona, _ = get_historical_persona(request.region)
            system_prompt = format_persona_instructions(persona)

        ai_response = generate(
            user_text=request.text,
            system_prompt=system_prompt,
            history=history,
            temperature=0.8,
            max_output_tokens=500,
        )
        ai_response = clean_text_formatting(ai_response)

        history.append({"role": "user", "parts": [{"text": request.text}]})
        history.append({"role": "model", "parts": [{"text": ai_response}]})

        chat_mode = "family_member" if request.persona == "family_member" else "regional"
        save_chat_turn(
            session_id=session_id,
            user_text=request.text,
            assistant_text=ai_response,
            chat_mode=chat_mode,
            governorate_key=request.region if chat_mode == "regional" else None,
            family_member_id=(request.member_id or request.member_name) if chat_mode == "family_member" else None,
        )

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


@router.post("/api/stt")
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
        transcribed_text = _transcribe_audio(audio_bytes, filename)

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


@router.post("/api/chat/audio", response_model=AudioChatResponse)
async def chat_audio(
    file: UploadFile = File(...),
    session_id: str = Form(default=None),
    region: str = Form(default="aswan"),
    persona: str = Form(default=None),
    member_id: str = Form(default=None),
    member_name: str = Form(default=None),
    relation: str = Form(default=None),
):
    """
    Audio chat with a regional or family member persona.

    Receives an audio file (WebM/OGG/WAV), transcribes it via Deepgram/Speechmatics,
    then sends the transcribed text to Gemini for a persona response.
    """
    try:
        audio_bytes = await file.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        filename = file.filename or "recording.webm"
        transcribed_text = _transcribe_audio(audio_bytes, filename)

        if not transcribed_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe any text from the audio",
            )

        session_id = session_id or str(uuid4())
        history = get_history(session_id)

        is_family = (persona == "family_member" and (member_name or member_id))
        if is_family:
            system_prompt = build_family_prompt(member_name or "", relation)
            chat_mode = "family_member"
        else:
            persona_obj, _ = get_historical_persona(region)
            system_prompt = format_persona_instructions(persona_obj)
            chat_mode = "regional"

        ai_response = generate(
            user_text=transcribed_text,
            system_prompt=system_prompt,
            history=history,
            temperature=0.8,
            max_output_tokens=500,
        )
        ai_response = clean_text_formatting(ai_response)

        history.append({"role": "user", "parts": [{"text": transcribed_text}]})
        history.append({"role": "model", "parts": [{"text": ai_response}]})

        save_chat_turn(
            session_id=session_id,
            user_text=transcribed_text,
            assistant_text=ai_response,
            chat_mode=chat_mode,
            governorate_key=region if chat_mode == "regional" else None,
            family_member_id=(member_id or member_name) if chat_mode == "family_member" else None,
        )

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


@router.post("/api/chat/ancient", response_model=AncientChatResponse)
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
    """
    try:
        if not rag_is_ready():
            raise HTTPException(
                status_code=503,
                detail="خدمة الـ RAG غير جاهزة. تأكد من وجود ملف embeddings.json.",
            )

        session_id = request.session_id or str(uuid4())
        use_ancient = (request.language_mode == "ancient")

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
            if character_name == "ramsis" and not use_ancient:
                character_name = "amr-abdeen-modern"

        payload = retrieve_and_build(
            request.text,
            top_k=request.top_k,
            monument_name=monument_name_filter,
        )

        history = get_history(session_id)

        if use_ancient:
            ai_response, tts_text = generate_with_ancient(
                user_prompt=payload["user_prompt"],
                base_system_prompt=payload["system_prompt"],
                history=history,
                temperature=0.4,
                max_output_tokens=800,
                thinking_budget=0,
            )
        else:
            ai_response = generate(
                user_text=payload["user_prompt"],
                system_prompt=payload["system_prompt"],
                history=history,
                temperature=0.4,
                max_output_tokens=400,
                thinking_budget=0,
            )
            tts_text = ai_response

        ai_response = clean_text_formatting(ai_response)
        tts_text = clean_text_formatting(tts_text)

        if request.monument_key:
            builder = payload["builder"] or display_name
        else:
            builder = payload["builder"]

        save_chat_turn(
            session_id=session_id,
            user_text=request.text,
            assistant_text=ai_response,
            chat_mode="ancient",
            monument_key=request.monument_key,
            language_mode=request.language_mode,
            metadata={
                "builder": builder,
                "monument": payload["monument"],
                "persona_key": payload["persona_key"],
                "tts_text": tts_text,
            },
        )

        logger.info(
            "Ancient chat | session=%s... | monument=%s | builder=%s | mode=%s | user=%s...",
            session_id[:8], payload["monument"][:30],
            builder[:20], request.language_mode, request.text[:30],
        )

        return AncientChatResponse(
            response=ai_response,
            tts_text=tts_text,
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


@router.get("/api/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history_endpoint(
    session_id: str | None = None,
    monument_key: str | None = None,
    family_member_id: str | None = None,
    chat_mode: str | None = None,
):
    """
    Retrieve chat history for a session ID, or the most recent session for a monument or family member.
    """
    if session_id:
        messages = get_session_messages(session_id)
        return ChatHistoryResponse(session_id=session_id, messages=messages)

    sid, messages = get_recent_session_history(
        monument_key=monument_key,
        family_member_id=family_member_id,
        chat_mode=chat_mode,
    )
    return ChatHistoryResponse(session_id=sid, messages=messages)
