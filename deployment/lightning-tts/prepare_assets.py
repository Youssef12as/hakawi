"""Run online once before deploying; runtime itself uses packaged assets."""
import argparse
import hashlib
import json
import urllib.request
from pathlib import Path

from huggingface_hub import snapshot_download
from audio_utils import MAX_AUDIO_BYTES, normalize_audio, sanitize_name

BASE_DIR = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voices-only", action="store_true")
    args = parser.parse_args()
    versions = json.loads((BASE_DIR / "asset_versions.json").read_text(encoding="utf-8"))
    model_dir = BASE_DIR / "models" / "lahgtna-omnivoice-v2"
    if not args.voices_only:
        for component, destination in [("model", model_dir), ("audio_tokenizer", model_dir / "audio_tokenizer")]:
            source = versions[component]
            print(f"Downloading {component} at revision {source['revision']}")
            snapshot_download(repo_id=source["repo_id"], revision=source["revision"],
                              local_dir=str(destination), allow_patterns=["*.json", "*.jinja", "*.safetensors"])
        (model_dir / "asset_versions.json").write_text(json.dumps(versions, indent=2), encoding="utf-8")
    voices = json.loads((BASE_DIR / "voices.json").read_text(encoding="utf-8"))
    voice_dir = BASE_DIR / "pre_existing_voices"
    voice_dir.mkdir(parents=True, exist_ok=True)
    downloads = {}
    checksums = {}
    for original_key, entry in voices.items():
        key = sanitize_name(original_key)
        if entry["url"] not in downloads:
            with urllib.request.urlopen(entry["url"]) as response:
                raw = response.read(MAX_AUDIO_BYTES + 1)
            downloads[entry["url"]] = normalize_audio(raw)
        wav = downloads[entry["url"]]
        (voice_dir / f"{key}.wav").write_bytes(wav)
        (voice_dir / f"{key}.txt").write_text(entry["ref_text"].strip(), encoding="utf-8")
        checksums[key] = hashlib.sha256(wav).hexdigest()
        print(f"Prepared {key}: mono PCM WAV")
    (voice_dir / "checksums.json").write_text(json.dumps(checksums, indent=2), encoding="utf-8")
    print("Assets ready. Run python preflight.py on a GPU next.")


if __name__ == "__main__":
    main()
