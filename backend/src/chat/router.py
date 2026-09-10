import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from src.auth import get_current_user_id
from src.config import settings
from src.chat.ancient_translation import generate_with_ancient
from src.chat.rag_service import is_ready as rag_is_ready, retrieve_and_build
from src.chat.schemas import (
    AncientChatRequest,
    AncientChatResponse,
    AudioChatResponse,
    ChatHistoryResponse,
    SessionCreateRequest,
    SessionDetail,
    SessionResponse,
    SessionSummary,
    TextChatRequest,
    TextChatResponse,
)
from src.chat.service import (
    SessionForbidden,
    SessionNotFound,
    clean_text_formatting,
    create_session,
    delete_session,
    get_history,
    get_recent_session_history,
    get_session_detail,
    get_session_messages,
    list_user_sessions,
    save_chat_turn,
    verify_session_ownership,
)
from src.chat.metrics import PipelineMetrics, timed_section, log_pipeline_metrics
from src.chat.utils import format_persona_instructions, get_historical_persona
from src.family.utils import build_family_prompt
from src.governorates.utils import get_monument_by_key
from src.integrations.gemini import generate
from src.integrations.speechmatics import transcribe_audio as transcribe_audio_speechmatics

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


def _transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """Transcribe Egyptian Arabic audio through Speechmatics."""
    if not settings.SPEECHMATICS_API_KEY:
        raise RuntimeError("SPEECHMATICS_API_KEY is not configured.")

    return transcribe_audio_speechmatics(audio_bytes, filename)


def _ensure_session_access(session_id: str | None, user_id: str) -> None:
    """
    Verify the user may write to this session (own it or create it).
    Raises 404 when the session exists but belongs to another user.
    """
    if session_id and not verify_session_ownership(session_id, user_id):
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة.")


# ─── Session management (authenticated) ────────────────────────────────────


def _ts(dt) -> int:
    return int(dt.timestamp() * 1000) if dt else 0


@router.post("/api/chat/sessions", response_model=SessionResponse)
async def create_chat_session(
    request: SessionCreateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new chat session owned by the authenticated user.
    The frontend sends the Supabase access token; the backend verifies it,
    extracts the user id, and stamps it on the session. No guests allowed.
    """
    try:
        session = create_session(
            user_id=user_id,
            chat_mode=request.chat_mode,
            governorate_key=request.governorate_key,
            monument_key=request.monument_key,
            family_member_id=request.family_member_id,
            language_mode=request.language_mode,
            title=request.title,
            session_id=request.session_id,
        )
        return SessionResponse(
            session_id=str(session["id"]),
            chat_mode=session["chat_mode"],
            title=session["title"] or "محادثة جديدة",
            created_at=_ts(session.get("created_at")),
            updated_at=_ts(session.get("updated_at")),
        )
    except SessionForbidden:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة.")
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.get("/api/chat/sessions")
async def list_chat_sessions(user_id: str = Depends(get_current_user_id)):
    """List all chat sessions owned by the authenticated user, newest first."""
    sessions = list_user_sessions(user_id)
    return {
        "sessions": [SessionSummary(**s).model_dump() for s in sessions],
    }


@router.get("/api/chat/sessions/{session_id}", response_model=SessionDetail)
async def get_chat_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get a session with its full transcript. Users can only access their own
    sessions — a foreign session id returns 404 (existence is not leaked).
    """
    try:
        detail = get_session_detail(session_id, user_id)
        return SessionDetail(**detail)
    except (SessionNotFound, SessionForbidden):
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة.")


@router.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a session (and its turns) owned by the authenticated user."""
    if not delete_session(session_id, user_id):
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة.")
    return {"status": "deleted"}


# ─── Chat endpoints (authentication required) ──────────────────────────────


@router.post("/api/chat/text", response_model=TextChatResponse)
async def chat_text(
    request: TextChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Text chat with a regional or family persona.
    Requires authentication; sessions are owned by the authenticated user.
    """
    try:
        metrics = PipelineMetrics()
        metrics.start()
        metrics.user_query = request.text
        metrics.response_mode = "regional_chat"

        _ensure_session_access(request.session_id, user_id)
        session_id = request.session_id or str(uuid4())
        history = get_history(session_id)

        # Family member mode: use relation-based persona
        is_family = request.persona == "family_member" and request.member_name
        if is_family:
            system_prompt = build_family_prompt(request.member_name, request.relation)
        else:
            persona, _ = get_historical_persona(request.region)
            system_prompt = format_persona_instructions(persona)
            
            # 🖼️ Inject local images for Aswan's Am Othman
            if "aswan" in request.region.lower() or "عثمان" in request.region:
                system_prompt += (
                    "\n\n[أوامر بصرية إجبارية]:\n"
                    "أنت مبرمج لعرض صور حقيقية للزائر. يجب عليك نسخ كود الصورة حرفياً ووضعه في نهاية إجابتك إذا تحقق الشرط التالي:\n"
                    "- إذا ذكرت أو وصفت 'البيوت النوبية' أو 'القرى النوبية' أو 'النوبة'، أضف في نهاية ردك: ![بيوت النوبة](/images/monuments/nubian_village.jpg)\n"
                    "- إذا ذكرت أو وصفت 'الفلوكة' أو 'المراكب' أو 'نيل أسوان'، أضف في نهاية ردك: ![الفلوكة في نيل أسوان](/images/monuments/aswan_nile.jpg)\n"
                )

        with timed_section(metrics, "generation"):
            ai_response = generate(
                user_text=request.text,
                system_prompt=system_prompt,
                history=history,
                temperature=0.8,
                max_output_tokens=500,
            )
        ai_response = clean_text_formatting(ai_response)

        # Log metrics
        log_pipeline_metrics(metrics)

        chat_mode = "family_member" if is_family else "regional"
        session_id = save_chat_turn(
            session_id=session_id,
            user_id=user_id,
            question=request.text,
            response=ai_response,
            chat_mode=chat_mode,
            governorate_key=request.region if chat_mode == "regional" else None,
            family_member_id=(request.member_id or request.member_name) if is_family else None,
            metadata={
                "member_name": request.member_name if is_family else None,
                "relation": request.relation if is_family else None,
            },
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

    except HTTPException:
        raise
    except SessionForbidden:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة.")
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
    user_id: str = Depends(get_current_user_id),
):
    """
    Audio chat with a regional or family member persona.
    Requires authentication; sessions are owned by the authenticated user.
    """
    try:
        _ensure_session_access(session_id, user_id)

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

        session_id = save_chat_turn(
            session_id=session_id,
            user_id=user_id,
            question=transcribed_text,
            response=ai_response,
            chat_mode=chat_mode,
            governorate_key=region if chat_mode == "regional" else None,
            family_member_id=(member_id or member_name) if is_family else None,
            metadata={
                "member_name": member_name if is_family else None,
                "relation": relation if is_family else None,
            },
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
    except SessionForbidden:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة.")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in chat_audio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/api/chat/ancient", response_model=AncientChatResponse)
async def chat_ancient(
    request: AncientChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    RAG-backed chat with a historical character (Ancient Mode).
    Requires authentication; sessions are owned by the authenticated user.

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
        # --- Initialize metrics ---
        metrics = PipelineMetrics()
        metrics.start()
        metrics.user_query = request.text
        metrics.language_mode = request.language_mode

        if not rag_is_ready():
            raise HTTPException(
                status_code=503,
                detail="خدمة الـ RAG غير جاهزة. تأكد من وجود ملف embeddings.json.",
            )

        _ensure_session_access(request.session_id, user_id)
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

        # --- Timed: RAG Search + Prompt Building ---
        with timed_section(metrics, "rag_search"):
            payload = retrieve_and_build(
                request.text,
                top_k=request.top_k,
                monument_name=monument_name_filter,
                response_mode=request.response_mode,
            )

        # Extract confidence score (top chunk's cosine similarity)
        if payload.get("chunks"):
            metrics.confidence_score = payload["chunks"][0][0]  # top score
            metrics.chunks_retrieved = len(payload["chunks"])
        metrics.monument = payload.get("monument", "")
        metrics.builder = payload.get("builder", "")
        metrics.persona_key = payload.get("persona_key", "")
        metrics.response_mode = request.response_mode

        history = get_history(session_id)

        # --- Timed: LLM Generation ---
        with timed_section(metrics, "generation"):
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

        # --- Log all metrics ---
        log_pipeline_metrics(metrics)

        session_id = save_chat_turn(
            session_id=session_id,
            user_id=user_id,
            question=request.text,
            response=ai_response,
            chat_mode="ancient",
            monument_key=request.monument_key,
            language_mode=request.language_mode,
            metadata={
                "builder": builder,
                "monument": payload["monument"],
                "persona_key": payload["persona_key"],
                "tts_text": tts_text,
                "character_name": character_name,
                "response_mode": request.response_mode,
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
    except SessionForbidden:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة.")
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
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve chat history for the authenticated user only:
    - by explicit session id (ownership enforced), or
    - the user's most recent session for a monument / family member / mode.
    """
    if session_id:
        if not verify_session_ownership(session_id, user_id):
            raise HTTPException(status_code=404, detail="الجلسة غير موجودة.")
        messages = get_session_messages(session_id)
        return ChatHistoryResponse(session_id=session_id, messages=messages)

    sid, messages = get_recent_session_history(
        user_id=user_id,
        monument_key=monument_key,
        family_member_id=family_member_id,
        chat_mode=chat_mode,
    )
    return ChatHistoryResponse(session_id=sid, messages=messages)
