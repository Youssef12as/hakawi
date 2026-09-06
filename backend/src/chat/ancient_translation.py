"""
Ancient Egyptian translation helper for TTS output.

Attempts a single Gemini call that produces both the normal Arabic reply
AND an old-Egyptian phonetic transliteration.  If the model returns both
sections, we parse them out.  Otherwise, a fallback second call is made.
"""

import logging
import re

from src.integrations.gemini import generate

logger = logging.getLogger(__name__)

# ─── System prompt for the dual-output single call ────────────────────────

DUAL_OUTPUT_SYSTEM_PROMPT = (
    "أنت محرك شخصيات تاريخية مصرية.  عندك مهمتان في هذا الرد:\n\n"
    "١. أولاً: اكتب الرد بالعربية العادية كشخصية تاريخية (كما ستفعل عادةً).\n"
    "٢. ثانياً: اكتب نفس الرد محوّلاً إلى المصرية القديمة بحروف عربية "
    "(transliteration صوتي للمصرية القديمة بالأبجدية العربية، مثال: "
    "\"واع ثِن خِيِمِت فِي دُو دِي يو سِيسُو سِيفِخو خيمينو بِسيج\").\n\n"
    "شكل الرد المطلوب بالضبط:\n"
    "===ARABIC===\n"
    "[الرد بالعربية العادية]\n"
    "===ANCIENT===\n"
    "[نفس الرد بالمصرية القديمة بحروف عربية]\n\n"
    "لا تضف أي شيء قبل ===ARABIC=== أو بعد النص القديم.\n"
    "حافظ على شخصيتك التاريخية ونبرتك في كلا الردين.\n"
)

# ─── Fallback: translate-only prompt ──────────────────────────────────────

TRANSLATE_ONLY_SYSTEM_PROMPT = (
    "حوّل النص العربي التالي إلى المصرية القديمة بحروف عربية "
    "(transliteration صوتي). اكتب فقط النص المحوّل بدون أي شرح أو مقدمة."
)


def _parse_dual_response(text: str) -> tuple[str, str] | None:
    """
    Try to extract ARABIC and ANCIENT sections from a dual-output response.
    Returns (arabic_text, ancient_text) or None if parsing fails.
    """
    # Look for the markers
    arabic_match = re.search(r"===ARABIC===\s*\n(.*?)(?=\n===ANCIENT===)", text, re.DOTALL)
    ancient_match = re.search(r"===ANCIENT===\s*\n(.*)", text, re.DOTALL)

    if arabic_match and ancient_match:
        arabic = arabic_match.group(1).strip()
        ancient = ancient_match.group(1).strip()
        if arabic and ancient:
            return arabic, ancient

    return None


def generate_with_ancient(
    *,
    user_prompt: str,
    base_system_prompt: str,
    history: list[dict] | None = None,
    temperature: float = 0.4,
    max_output_tokens: int = 800,
    thinking_budget: int = 0,
) -> tuple[str, str]:
    """
    Generate a response with both Arabic and Ancient Egyptian versions.

    Tries a single dual-output call first.  If parsing fails, falls back
    to two separate calls.

    Returns:
        (arabic_text, ancient_text)
    """
    # ── Single call attempt ───────────────────────────────────────────
    combined_system = base_system_prompt + "\n\n" + DUAL_OUTPUT_SYSTEM_PROMPT
    try:
        raw = generate(
            user_text=user_prompt,
            system_prompt=combined_system,
            history=history,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            thinking_budget=thinking_budget,
        )
        parsed = _parse_dual_response(raw)
        if parsed:
            logger.info("Dual-output parse succeeded (single call)")
            return parsed
        else:
            logger.warning("Dual-output parse failed, raw=%s...", raw[:120])
    except Exception as e:
        logger.error("Dual-output single call failed: %s", e)

    # ── Fallback: two separate calls ──────────────────────────────────
    logger.info("Falling back to two-call approach")

    # Call 1: normal Arabic response
    arabic_text = generate(
        user_text=user_prompt,
        system_prompt=base_system_prompt,
        history=history,
        temperature=temperature,
        max_output_tokens=max_output_tokens // 2,
        thinking_budget=thinking_budget,
    )

    # Call 2: translate the Arabic response to old Egyptian
    ancient_text = generate(
        user_text=arabic_text,
        system_prompt=TRANSLATE_ONLY_SYSTEM_PROMPT,
        temperature=0.3,
        max_output_tokens=max_output_tokens // 2,
        thinking_budget=0,
    )

    return arabic_text, ancient_text
