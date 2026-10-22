"""Test the exact JSON contract used by Hakawi, without printing credentials."""
import argparse
import base64
import io
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

import soundfile as sf


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=os.getenv("VOICE_API_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--character", default="am-othman")
    parser.add_argument("--text", default="أهلاً بيك في حكاوي، صوت الماضي حي في الحاضر.")
    parser.add_argument("--inline-audio", type=Path)
    parser.add_argument("--ref-text")
    parser.add_argument("--save-only", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("test-output/speech.wav"))
    args = parser.parse_args()
    if bool(args.inline_audio) != bool(args.ref_text):
        parser.error("--inline-audio and --ref-text must be supplied together")
    if args.save_only and not args.inline_audio:
        parser.error("--save-only requires --inline-audio and --ref-text")
    headers = {"Content-Type": "application/json"}
    token = os.getenv("VOICE_API_KEY")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    health_request = urllib.request.Request(args.url.rstrip("/") + "/health", headers=headers)
    with urllib.request.urlopen(health_request) as response:
        print("Health:", response.status)
    payload = {"action": "save_character" if args.save_only else "generate",
               "char_name": args.character, "text": args.text}
    if args.inline_audio:
        payload.update(audio_prompt=base64.b64encode(args.inline_audio.read_bytes()).decode("ascii"),
                       ref_text=args.ref_text)
    request = urllib.request.Request(args.url.rstrip("/") + "/", headers=headers,
                                    data=json.dumps(payload).encode("utf-8"), method="POST")
    started = time.perf_counter()
    # No explicit HTTP timeout: keep the user's current timeout policy.
    with urllib.request.urlopen(request) as response:
        result = json.load(response)
    if result.get("status") != "success":
        raise SystemExit(f"TTS failed: {result.get('message', result)}")
    if args.save_only:
        print(result["message"])
        return
    audio = base64.b64decode(result["audio_base64"], validate=True)
    info = sf.info(io.BytesIO(audio))
    if info.format != "WAV" or info.frames == 0:
        raise SystemExit("Server returned invalid or empty WAV audio")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(audio)
    print(f"Success: {args.output}, {info.samplerate} Hz, {info.duration:.2f}s audio, "
          f"{time.perf_counter() - started:.2f}s request")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"HTTP {exc.code}: check endpoint authentication and deployment logs") from exc
