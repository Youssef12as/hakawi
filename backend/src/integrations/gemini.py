import logging
import time

from google import genai
from google.genai import types

from src.config import settings

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
    Shared retry wrapper around ``client.models.generate_content``.

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


from opentelemetry import trace
tracer = trace.get_tracer("hikawi.llm")

def generate(
    user_text: str,
    system_prompt: str,
    history: list[dict] | None = None,
    temperature: float = 0.4,
    max_output_tokens: int = 400,
    thinking_budget: int = 0,
) -> str:
    with tracer.start_as_current_span("Gemini.generate_content") as span:
        span.set_attribute("gen_ai.system", "gemini")
        span.set_attribute("gen_ai.request.model", MODEL_ID)
        span.set_attribute("llm.system_prompt", system_prompt)
        span.set_attribute("llm.user_text", user_text)
        span.set_attribute("llm.temperature", temperature)
        
        contents = list(history or []) + [
            {"role": "user", "parts": [{"text": user_text}]}
        ]
        
        try:
            result = _generate_with_retry(
                contents=contents,
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                thinking_budget=thinking_budget,
            )
            span.set_attribute("llm.response", result)
            return result
        except Exception as e:
            span.record_exception(e)
            raise e
