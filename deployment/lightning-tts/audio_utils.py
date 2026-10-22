"""Bounded decoding of browser recordings and reference audio into real WAV."""
import base64
import binascii
import io
import os
import re
import subprocess

import numpy as np
import soundfile as sf

MAX_AUDIO_BYTES = 10 * 1024 * 1024
MAX_REFERENCE_SECONDS = 30


def sanitize_name(value: str) -> str:
    if not isinstance(value, str) or len(value) > 100:
        raise ValueError("char_name must be a string of at most 100 characters")
    value = value.replace("/", "").replace("\\", "").replace("..", "")
    value = re.sub(r"\s+", "_", value.strip())
    value = re.sub(r"[^\w\-]", "", value)
    if not value or value.strip("_-") == "":
        raise ValueError("char_name contains no usable characters")
    return value


def decode_base64_audio(value: str) -> bytes:
    if not isinstance(value, str) or not value:
        raise ValueError("audio_prompt must contain base64 audio")
    if len(value) > 4 * ((MAX_AUDIO_BYTES + 2) // 3):
        raise ValueError("Reference audio exceeds the 10 MiB limit")
    try:
        audio = base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("audio_prompt is not valid base64") from exc
    if not audio or len(audio) > MAX_AUDIO_BYTES:
        raise ValueError("Reference audio is empty or exceeds the 10 MiB limit")
    return audio


def normalize_audio(raw: bytes, sample_rate: int = 24000) -> bytes:
    """Decode by content, including WebM; filenames never determine the codec."""
    if not raw or len(raw) > MAX_AUDIO_BYTES:
        raise ValueError("Reference audio is empty or exceeds the 10 MiB limit")
    # Bound decoded output to 31 seconds, then reject clips over 30 seconds.
    command = [
        os.getenv("FFMPEG_BINARY", "ffmpeg"), "-hide_banner", "-loglevel", "error",
        "-protocol_whitelist", "pipe", "-i", "pipe:0", "-map", "0:a:0", "-vn",
        "-ac", "1", "-ar", str(sample_rate),
        "-t", str(MAX_REFERENCE_SECONDS + 1), "-f", "wav", "pipe:1",
    ]
    try:
        result = subprocess.run(command, input=raw, capture_output=True, check=False)
    except FileNotFoundError as exc:
        raise RuntimeError("FFmpeg is missing; install it before starting the server") from exc
    if result.returncode != 0:
        raise ValueError("Reference audio cannot be decoded; use WAV, MP3, or WebM")
    try:
        waveform, rate = sf.read(io.BytesIO(result.stdout), dtype="float32")
    except (sf.LibsndfileError, ValueError) as exc:
        raise ValueError("Reference audio could not be converted to WAV") from exc
    if waveform.ndim != 1 or waveform.size == 0 or not np.isfinite(waveform).all():
        raise ValueError("Reference audio is empty or invalid")
    duration = waveform.size / rate
    if duration < 0.5 or duration > MAX_REFERENCE_SECONDS:
        raise ValueError("Reference audio must be between 0.5 and 30 seconds; prefer 3–10 seconds")
    if float(np.max(np.abs(waveform))) < 1e-5:
        raise ValueError("Reference audio contains only silence")
    output = io.BytesIO()
    sf.write(output, waveform, rate, format="WAV", subtype="PCM_16")
    return output.getvalue()
