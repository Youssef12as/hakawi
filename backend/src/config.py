import os
from pydantic_settings import BaseSettings

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_file = os.path.join(_backend_dir, ".env")


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    GEMINI_API_KEY: str = ""
    SPEECHMATICS_API_KEY: str = ""
    VOICE_API_URL: str = "https://8000-01kx664hbtgq4yqfk20rj2ycx1.cloudspaces.litng.ai"
    DEEPGRAM_API_KEY: str = ""
    DATABASE_URL: str = ""
    SUPABASE_URL: str = "https://hueymfgudrgdlmyaxeoi.supabase.co"
    SUPABASE_ANON_KEY: str = ""
    # Supabase JWT secret (Dashboard -> Project Settings -> API -> JWT Secret).
    # Used to verify HS256 access tokens sent by the frontend.
    SUPABASE_JWT_SECRET: str = ""

    model_config = {
        "env_file": (_env_file, ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
