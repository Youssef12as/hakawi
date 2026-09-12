import logging
from typing import Any

from src.database import get_db_cursor

logger = logging.getLogger(__name__)


def sanitize_character_name(name: str) -> str:
    """Sanitize character name for safe identifier and file path usage."""
    return name.strip().replace(" ", "_")


def get_voice(voice_name: str) -> dict[str, Any] | None:
    """Fetch voice persona record from Supabase by key or name."""
    if not voice_name:
        return None

    safe_name = sanitize_character_name(voice_name)
    try:
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT key, name, ref_audio_path, ref_text, is_custom
                FROM public.voice_personas
                WHERE key = %s OR key = %s OR name = %s
                LIMIT 1;
                """,
                (voice_name, safe_name, voice_name),
            )
            row = cur.fetchone()
            if row:
                return dict(row)
    except Exception as e:
        logger.error(f"Error fetching voice persona '{voice_name}' from database: {e}")

    return None


def get_voice_by_name(voice_name: str) -> dict[str, Any] | None:
    """Alias kept for backwards compatibility."""
    return get_voice(voice_name)


def list_voices() -> list[str]:
    """Return all registered voice keys from Supabase."""
    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT key FROM public.voice_personas ORDER BY key;")
            rows = cur.fetchall()
            return [r["key"] for r in rows]
    except Exception as e:
        logger.error(f"Error listing voice personas from database: {e}")
        return []


def resolve_character_ref(character_name: str) -> tuple[str | None, str | None]:
    """
    Resolve a character's reference audio path and text from Supabase voice_personas.
    Returns (ref_audio_path, ref_text).
    """
    voice = get_voice(character_name)
    if voice and voice.get("ref_audio_path") and voice.get("ref_text"):
        return voice["ref_audio_path"], voice["ref_text"]
    return None, None
