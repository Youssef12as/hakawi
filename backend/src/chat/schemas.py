from pydantic import BaseModel


class TextChatRequest(BaseModel):
    text: str
    session_id: str | None = None
    # Region is optional so the existing frontend payload keeps working.
    # Defaults to "aswan" for backwards compatibility.
    region: str = "aswan"
    # Family tree chat fields (optional)
    persona: str | None = None        # "family_member" to trigger family mode
    member_name: str | None = None    # e.g. "فاطمة"
    relation: str | None = None       # e.g. "جدة", "أب"


class TextChatResponse(BaseModel):
    response: str
    session_id: str
    region: str


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


class AncientChatResponse(BaseModel):
    response: str
    tts_text: str  # Text to be spoken by TTS (old Egyptian when ancient mode)
    session_id: str
    monument: str
    builder: str
    persona_key: str
    display_name: str
    character_name: str
