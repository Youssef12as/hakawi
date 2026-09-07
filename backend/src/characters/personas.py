"""
Voice and identity registry for Hakawi characters.
Hardcoded VOICES dict has been removed as characters are stored in Supabase voice_personas.
Functions are re-exported from src.characters.utils for backwards compatibility.
"""

from src.characters.constants import CHARACTERS_AUDIO_DIR, DEFAULT_VOICE
from src.characters.utils import (
    get_voice,
    get_voice_by_name,
    list_voices,
    resolve_character_ref,
    sanitize_character_name,
)

__all__ = [
    "DEFAULT_VOICE",
    "CHARACTERS_AUDIO_DIR",
    "get_voice",
    "get_voice_by_name",
    "list_voices",
    "resolve_character_ref",
    "sanitize_character_name",
]
