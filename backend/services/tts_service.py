import logging
import os
import tempfile

from gradio_client import Client, handle_file

from config import settings

logger = logging.getLogger(__name__)

# Initialize Gradio client (lazy — connects on first call)
_gradio_client = None

# Track saved characters
saved_characters: list[str] = []


def _get_client() -> Client:
    """Lazy-initialize the Gradio TTS client."""
    global _gradio_client
    if _gradio_client is None:
        logger.info(f"Connecting to Gradio TTS at: {settings.GRADIO_TTS_URL}")
        _gradio_client = Client(settings.GRADIO_TTS_URL)
    return _gradio_client


def save_character(
    char_name: str,
    audio_bytes: bytes,
    audio_filename: str,
    ref_text: str,
) -> tuple[str, None] | tuple[None, str]:
    """
    Save a new character voice to the Gradio TTS model.

    Args:
        char_name: Name for the character.
        audio_bytes: Raw audio bytes of the reference voice clip.
        audio_filename: Original filename of the audio.
        ref_text: The reference text spoken in the audio clip.

    Returns:
        (success_message, None) on success.
        (None, error_message) on failure.
    """
    try:
        client = _get_client()

        # Write audio bytes to a temp file (Gradio needs a file path)
        suffix = os.path.splitext(audio_filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            result = client.predict(
                char_name=char_name,
                audio_path=handle_file(tmp_path),
                ref_text=ref_text,
                api_name="/save_new_character",
            )

            # result is (markdown_message, dropdown_options)
            message = result[0] if isinstance(result, (list, tuple)) else str(result)
            logger.info(f"Character saved: {char_name} — {message}")

            # Track the saved character
            if char_name not in saved_characters:
                saved_characters.append(char_name)

            return message, None

        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        logger.error(f"Failed to save character: {e}")
        global _gradio_client
        _gradio_client = None
        return None, f"Failed to save character: {e}"


def synthesize_speech(text: str, character_name: str) -> tuple[str, None] | tuple[None, str]:
    """
    Synthesize speech using the Gradio TTS API.

    Args:
        text: The Arabic text to synthesize.
        character_name: Character name from the saved characters.

    Returns:
        (filepath, None) on success — path to the generated audio file.
        (None, error_message) on failure.
    """
    try:
        client = _get_client()

        result = client.predict(
            text=text,
            custom_name=character_name,
            api_name="/generate",
        )

        # result is a filepath to the generated audio
        if result and os.path.exists(result):
            logger.info(f"TTS audio generated: {result}")
            return result, None
        else:
            return None, f"Gradio TTS returned no audio file: {result}"

    except Exception as e:
        logger.error(f"Gradio TTS error: {e}")
        global _gradio_client
        _gradio_client = None
        return None, f"Gradio TTS failed: {e}"
