import logging
from typing import Any

from src.chat.constants import DEFAULT_PERSONA_INSTRUCTION, PERSONA_FORMATTING_RULES
from src.database import get_db_cursor

logger = logging.getLogger(__name__)


def get_historical_persona(monument_name: str) -> tuple[dict[str, Any] | None, str]:
    """
    Match a monument name (as stored in the RAG chunks) to a historical persona
    directly from Supabase public.historical_prompts.
    Returns (persona_dict_or_None, matched_key_or_clean_name).
    """
    monument_clean = monument_name.replace("#", "").strip()

    try:
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT monument_name, tone, language, vocabulary, on_unknown, example, avoid
                FROM public.historical_prompts;
                """
            )
            rows = cur.fetchall()

        for r in rows:
            key = r["monument_name"]
            key_words = key.split("—")[0].strip()
            if any(
                word in monument_clean
                for word in key_words.split()
                if len(word) > 2
            ):
                persona_dict = {
                    "tone": r["tone"],
                    "language": r["language"],
                    "vocabulary": r["vocabulary"],
                    "on_unknown": r["on_unknown"],
                    "example": r.get("example") or "",
                    "avoid": r.get("avoid") or "",
                }
                return persona_dict, key
    except Exception as e:
        logger.error(f"Error querying historical_prompts from Supabase: {e}")

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
