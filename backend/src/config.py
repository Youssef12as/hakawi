from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    GEMINI_API_KEY: str = ""
    SPEECHMATICS_API_KEY: str = ""
    VOICE_API_URL: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
