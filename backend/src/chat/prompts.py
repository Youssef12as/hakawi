"""
Historical character personas for the RAG-backed "Ancient Mode".
Hardcoded HISTORICAL_PERSONAS dict has been removed as it is seeded to Supabase historical_prompts.
Functions and constants are re-exported from src.chat.utils and src.chat.constants.
"""

from src.chat.constants import DEFAULT_PERSONA_INSTRUCTION, PERSONA_FORMATTING_RULES
from src.chat.utils import format_persona_instructions, get_historical_persona

__all__ = [
    "DEFAULT_PERSONA_INSTRUCTION",
    "PERSONA_FORMATTING_RULES",
    "get_historical_persona",
    "format_persona_instructions",
]
