"""Check the deployment environment before loading multi-gigabyte weights."""
import shutil
import subprocess
import sysconfig
from pathlib import Path

import soundfile as sf
import torch
from omnivoice import OmniVoice


def main():
    base = Path(__file__).resolve().parent
    if not shutil.which("ffmpeg") or not shutil.which("gcc"):
        raise SystemExit("Install ffmpeg and gcc first")
    if not (Path(sysconfig.get_path("include")) / "Python.h").is_file():
        raise SystemExit("Python.h is missing for this Python interpreter; install matching development headers")
    if not torch.cuda.is_available():
        raise SystemExit("CUDA unavailable: choose a GPU machine and check the NVIDIA driver")
    # Exercise CUDA, rather than only checking the presence of a driver.
    probe = torch.ones(16, device="cuda")
    assert float((probe * 2).sum().item()) == 32
    print("GPU:", torch.cuda.get_device_name(0))
    print("PyTorch:", torch.__version__, "CUDA build:", torch.version.cuda)
    if not hasattr(OmniVoice, "create_voice_clone_prompt"):
        raise SystemExit("Installed OmniVoice does not support prepared voice prompts")
    model = base / "models" / "lahgtna-omnivoice-v2"
    for relative in ["config.json", "model.safetensors", "tokenizer.json",
                     "audio_tokenizer/config.json", "audio_tokenizer/model.safetensors",
                     "audio_tokenizer/preprocessor_config.json"]:
        if not (model / relative).is_file():
            raise SystemExit(f"Missing {relative}; run prepare_assets.py")
    transcripts = list((base / "pre_existing_voices").glob("*.txt"))
    if not transcripts:
        raise SystemExit("No built-in voices; run prepare_assets.py")
    for transcript in transcripts:
        info = sf.info(transcript.with_suffix(".wav"))
        if info.format != "WAV" or info.samplerate != 24000 or info.channels != 1:
            raise SystemExit(f"Invalid prepared voice: {transcript.stem}")
    subprocess.run(["gcc", "--version"], stdout=subprocess.DEVNULL, check=True)
    print(f"Preflight passed: {len(transcripts)} voices, model + audio tokenizer available")


if __name__ == "__main__":
    main()
