import logging
from typing import Any

from src.chat.constants import DEFAULT_PERSONA_INSTRUCTION, PERSONA_FORMATTING_RULES
from src.chat.historical_prompts import HISTORICAL_PERSONAS

logger = logging.getLogger(__name__)


def get_historical_persona(monument_name: str) -> tuple[dict[str, Any] | None, str]:
    """
    Match a monument name (as stored in the RAG chunks) to its locally loaded
    historical persona. This keeps prompt lookup off the response-time
    database path.
    Returns (persona_dict_or_None, matched_key_or_clean_name).
    """
    monument_clean = monument_name.replace("#", "").strip()

    for key, persona_dict in HISTORICAL_PERSONAS.items():
        # e.g. key = "أبو سمبل — رمسيس الثاني"
        # We check if the monument part (e.g. "أبو سمبل") is in our clean name
        key_words = key.split("—")[0].strip()
        if any(
            word in monument_clean
            for word in key_words.split()
            if len(word) > 2
        ):
            return persona_dict, key

    return None, monument_clean


def format_persona_instructions(persona: dict[str, Any] | None) -> str:
    """Build the Arabic persona-instruction block injected into the prompt."""
    if not persona:
        return DEFAULT_PERSONA_INSTRUCTION

    return (
        f"النبرة: {persona['tone']}\n"
        f"اللغة: {persona['language']}\n"
        f"مفردات مناسبة: {persona['vocabulary']}\n"
        f"إذا سُئلت عن شيء لا تعرفه إطلاقاً أو خارج عن نطاق عصرك تماماً، يمكنك الرد بـ: \"{persona['on_unknown']}\"\n"
        f"مثال على أسلوبك: \"{persona['example']}\"\n"
        f"تجنب: {persona['avoid']}\n\n"
        f"{PERSONA_FORMATTING_RULES}\n"
    )
