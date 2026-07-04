import logging
import time

from google import genai
from google.genai import types

from config import settings

logger = logging.getLogger(__name__)

# Initialize the Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

MODEL_ID = "gemini-2.5-flash"

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


def generate_response(
    user_text: str,
    system_prompt: str,
    history: list[dict],
) -> str:
    """
    Generate a response from Gemini 2.5 Flash with persona and conversation history.
    Retries up to 3 times on temporary API failures (e.g., high demand).

    Args:
        user_text: The user's current message (Arabic text).
        system_prompt: The persona's system prompt from personas.py.
        history: List of previous messages in format:
                 [{"role": "user", "parts": [{"text": "..."}]},
                  {"role": "model", "parts": [{"text": "..."}]}]

    Returns:
        The generated text response in the regional dialect.
    """
    # Build contents: history + current user message
    contents = list(history) + [
        {"role": "user", "parts": [{"text": user_text}]}
    ]

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.4,
                    max_output_tokens=1024,
                ),
            )
            return response.text

        except Exception as e:
            last_error = e
            logger.warning(
                f"Gemini API error (attempt {attempt}/{MAX_RETRIES}): {e}"
            )
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)  # exponential-ish backoff

    logger.error(f"Gemini API failed after {MAX_RETRIES} attempts: {last_error}")
    raise RuntimeError(f"Failed to generate response from Gemini: {last_error}")
