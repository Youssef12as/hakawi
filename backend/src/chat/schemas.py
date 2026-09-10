from pydantic import BaseModel


class TextChatRequest(BaseModel):
    text: str
    session_id: str | None = None
    # Region is optional so the existing frontend payload keeps working.
    # Defaults to "aswan" for backwards compatibility.
    region: str = "aswan"
    # Family tree chat fields (optional)
    persona: str | None = None        # "family_member" to trigger family mode
    member_id: str | None = None      # e.g. "gf" or uuid
    member_name: str | None = None    # e.g. "فاطمة"
    relation: str | None = None       # e.g. "جدة", "أب"


class TextChatResponse(BaseModel):
    response: str
    session_id: str
    region: str


class ChatHistoryResponse(BaseModel):
    session_id: str | None
    messages: list[dict]


class AudioChatResponse(BaseModel):
    transcribed_text: str
    response: str
    session_id: str
    region: str


class AncientChatRequest(BaseModel):
    text: str
    session_id: str | None = None
    top_k: int = 4
    # Optional monument key (e.g. "abu-simbel") from the monuments registry.
    # When set, the RAG search is constrained to that monument's chunks and
    # the persona is resolved directly from the registry instead of being
    # fuzzy-matched from the top chunk.
    monument_key: str | None = None
    # "modern" = normal Arabic TTS, "ancient" = old Egyptian TTS
    language_mode: str = "modern"
    # Response style: "direct" = factual answer, "hikaya" = storytelling,
    # "presentation" = structured TED-talk style
    response_mode: str = "direct"


class AncientChatResponse(BaseModel):
    response: str
    tts_text: str  # Text to be spoken by TTS (old Egyptian when ancient mode)
    session_id: str
    monument: str
    builder: str
    persona_key: str
    display_name: str
    character_name: str


# ─── Authenticated session management (chat history) ──────────────────────


class SessionCreateRequest(BaseModel):
    chat_mode: str = "regional"          # regional | family_member | ancient
    governorate_key: str | None = None
    monument_key: str | None = None
    family_member_id: str | None = None
    language_mode: str = "modern"
    title: str | None = None
    # Optional client-generated id (e.g. from the map page uuid)
    session_id: str | None = None


class SessionResponse(BaseModel):
    session_id: str
    chat_mode: str
    title: str
    created_at: int
    updated_at: int


class SessionSummary(BaseModel):
    id: str
    chat_mode: str
    governorate_key: str | None = None
    monument_key: str | None = None
    family_member_id: str | None = None
    language_mode: str = "modern"
    title: str
    created_at: int
    updated_at: int
    turn_count: int


class SessionDetail(BaseModel):
    id: str
    chat_mode: str
    governorate_key: str | None = None
    monument_key: str | None = None
    family_member_id: str | None = None
    language_mode: str = "modern"
    title: str
    created_at: int
    updated_at: int
    messages: list[dict]
