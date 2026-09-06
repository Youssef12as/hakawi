from pydantic import BaseModel


class TTSRequest(BaseModel):
    text: str
    character_name: str | None = None
