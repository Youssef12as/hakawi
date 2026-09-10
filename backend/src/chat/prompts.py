"""
Historical character personas for the RAG-backed "Ancient Mode".
Persona definitions live locally in ``historical_prompts.py`` to avoid a
database request on the response-generation path. Supabase receives a seeded
reference mirror of the same definitions.
"""

from src.chat.constants import DEFAULT_PERSONA_INSTRUCTION, PERSONA_FORMATTING_RULES
from src.chat.historical_prompts import HISTORICAL_PERSONAS
from src.chat.utils import format_persona_instructions, get_historical_persona

__all__ = [
    "DEFAULT_PERSONA_INSTRUCTION",
    "PERSONA_FORMATTING_RULES",
    "HISTORICAL_PERSONAS",
    "get_historical_persona",
    "format_persona_instructions",
]
