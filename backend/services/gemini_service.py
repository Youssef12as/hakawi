import logging
import time

from google import genai
from google.genai import types

from config import settings

logger = logging.getLogger(__name__)

# Initialize the Gemini client (shared by both generation paths)
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Generation model
MODEL_ID = "gemini-3.1-flash-lite"

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


def _generate_with_retry(
    *,
    contents,
    system_instruction: str,
    temperature: float,
    max_output_tokens: int,
    thinking_budget: int = 0,
) -> str:
    """
    Shared retry wrapper around `client.models.generate_content`.

    Raises:
        ValueError  — when the API rate-limits us (surfaced to the user
                       as a friendly Arabic message).
        RuntimeError — when all retries fail.
    """
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                    thinking_config=types.ThinkingConfig(
                        thinking_budget=thinking_budget
                    ),
                ),
            )
            return response.text

        except Exception as e:
            last_error = e
            error_str = str(e)
            logger.warning(
                "Gemini API error (attempt %d/%d): %s",
                attempt,
                MAX_RETRIES,
                error_str,
            )

            # Rate limit → don't burn retries, surface immediately
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                logger.error("Rate limit hit, stopping retries.")
                raise ValueError(
                    "لقد تجاوزت الحد المسموح به من الرسائل. "
                    "يرجي الانتظار دقيقة والمحاولة مرة أخرى."
                )

            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)

    logger.error(
        "Gemini API failed after %d attempts: %s", MAX_RETRIES, last_error
    )
    raise RuntimeError(f"Failed to generate response from Gemini: {last_error}")


def generate_response(
    user_text: str,
    system_prompt: str,
    history: list[dict],
) -> str:
    """
    Generate a persona response from Gemini with conversation history.

    Used by the regional-dialect chat endpoints (text + audio).

    Args:
        user_text: The user's current message (Arabic text).
        system_prompt: The persona's system prompt from personas.py.
        history: List of previous messages in Gemini's format:
                 [{"role": "user",     "parts": [{"text": "..."}]},
                  {"role": "model",    "parts": [{"text": "..."}]}]

    Returns:
        The generated text response in the regional dialect.
    """
    contents = list(history) + [{"role": "user", "parts": [{"text": user_text}]}]
    return _generate_with_retry(
        contents=contents,
        system_instruction=system_prompt,
        temperature=0.8,
        max_output_tokens=500,
    )


def generate_rag_response(
    user_prompt: str,
    system_prompt: str,
) -> str:
    """
    Generate a RAG-grounded historical-character response.

    Used by the Ancient Mode endpoint.  Temperature is intentionally low
    to minimize hallucination, and `thinking_budget=0` keeps latency down
    for the live demo.

    Args:
        user_prompt: The fully-assembled user turn (persona + retrieved
                     context + question), produced by
                     `rag_service.build_rag_prompt`.
        system_prompt: The strict anti-hallucination system instructions
                       from `rag_service.build_rag_prompt`.

    Returns:
        The character's reply in Arabic (≈90–120 words, 2 paragraphs).
    """
    contents = [{"role": "user", "parts": [{"text": user_prompt}]}]
    return _generate_with_retry(
        contents=contents,
        system_instruction=system_prompt,
        temperature=0.4,
        max_output_tokens=400,
        thinking_budget=0,
    )
