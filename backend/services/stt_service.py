import json
import time
import logging

import requests

from config import settings

logger = logging.getLogger(__name__)

API_BASE = "https://asr.api.speechmatics.com/v2"

# Content type mapping for supported audio formats
CONTENT_TYPE_MAP = {
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
}


def _get_content_type(filename: str) -> str:
    """Determine content type from filename extension."""
    filename = filename.lower()
    for ext, content_type in CONTENT_TYPE_MAP.items():
        if filename.endswith(ext):
            return content_type
    # Default to webm (browser MediaRecorder default)
    return "audio/webm"


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribe Arabic audio using Speechmatics batch API.

    Args:
        audio_bytes: Raw bytes of the audio file.
        filename: Original filename (used to detect content type).
                  Supported: .webm, .ogg, .wav, .mp3, .m4a

    Returns:
        Transcribed Arabic text string.

    Raises:
        RuntimeError: If transcription fails or times out.
    """
    headers = {
        "Authorization": f"Bearer {settings.SPEECHMATICS_API_KEY}",
    }

    content_type = _get_content_type(filename)

    # STEP 1: Submit transcription job
    config = json.dumps({
        "type": "transcription",
        "transcription_config": {"language": "ar"},
    })

    files = {
        "data_file": (filename, audio_bytes, content_type),
        "config": (None, config, "application/json"),
    }

    try:
        response = requests.post(
            f"{API_BASE}/jobs/",
            headers=headers,
            files=files,
        )
        response.raise_for_status()
        job_id = response.json()["id"]
        logger.info(f"Speechmatics job submitted: {job_id}")
    except Exception as e:
        logger.error(f"Failed to submit STT job: {e}")
        raise RuntimeError(f"Failed to submit transcription job: {e}")

    # STEP 2: Poll for completion
    max_attempts = 60
    for attempt in range(max_attempts):
        time.sleep(1)

        try:
            response = requests.get(
                f"{API_BASE}/jobs/{job_id}",
                headers=headers,
            )
            # CRITICAL: Set UTF-8 encoding before reading Arabic text
            response.encoding = "utf-8"
            response.raise_for_status()

            job_status = response.json()["job"]["status"]
            logger.debug(f"Job {job_id} status: {job_status} (attempt {attempt + 1})")

            if job_status == "done":
                break
            elif job_status == "rejected":
                raise RuntimeError(
                    f"Transcription job {job_id} was rejected by Speechmatics"
                )
        except RuntimeError:
            raise
        except Exception as e:
            logger.warning(f"Error polling job status: {e}")
    else:
        raise RuntimeError(
            f"Transcription job {job_id} timed out after {max_attempts} seconds"
        )

    # STEP 3: Fetch transcript
    try:
        response = requests.get(
            f"{API_BASE}/jobs/{job_id}/transcript",
            headers={
                **headers,
                "Accept": "application/json",
            },
        )
        # CRITICAL: Set UTF-8 encoding before reading Arabic text
        response.encoding = "utf-8"
        response.raise_for_status()

        transcript_data = response.json()
        # Extract text from all results
        texts = []
        for result in transcript_data.get("results", []):
            for alt in result.get("alternatives", []):
                content = alt.get("content", "")
                if content:
                    texts.append(content)

        transcribed_text = " ".join(texts)
        logger.info(f"Transcription complete: {transcribed_text[:50]}...")
        return transcribed_text

    except Exception as e:
        logger.error(f"Failed to fetch transcript: {e}")
        raise RuntimeError(f"Failed to fetch transcript for job {job_id}: {e}")
