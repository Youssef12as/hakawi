"""Hakawi's backend-compatible Lightning TTS endpoint: POST /."""
import base64
import hashlib
import io
import json
import logging
import os
import time
from collections import OrderedDict
from pathlib import Path

import litserve as ls
import numpy as np
import soundfile as sf
import torch
from omnivoice import OmniVoice

from audio_utils import decode_base64_audio, normalize_audio, sanitize_name

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models" / "lahgtna-omnivoice-v2"
BUILTIN_DIR = BASE_DIR / "pre_existing_voices"
MAX_TEXT_CHARS = 2000
MAX_REF_TEXT_CHARS = 2000
MAX_CACHED_VOICES = 128
logger = logging.getLogger("hakawi.tts")


def atomic_write(path: Path, data: bytes) -> None:
    """Publish one complete file; never expose a partially written manifest."""
    import tempfile
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(data)
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


class HakawiVoiceAPI(ls.LitAPI):
    def __init__(self):
        super().__init__(api_path="/", max_batch_size=1)

    def setup(self, device):
        started = time.perf_counter()
        if not torch.cuda.is_available():
            raise RuntimeError("This deployment requires an NVIDIA GPU")
        for path in [MODEL_DIR / "config.json", MODEL_DIR / "model.safetensors",
                     MODEL_DIR / "audio_tokenizer" / "model.safetensors"]:
            if not path.is_file():
                raise RuntimeError(f"Missing model asset: {path}; run prepare_assets.py")
        logger.info("Loading OmniVoice on %s", device)
        self.model = OmniVoice.from_pretrained(
            str(MODEL_DIR), device_map=device, dtype=torch.float16,
            load_asr=False, local_files_only=True,
        )
        self.model.eval()
        self.sample_rate = int(self.model.sampling_rate)
        self.voice_cache = OrderedDict()
        self.builtin_refs = {}
        self.workspace_dir = Path(os.getenv("VOICE_CACHE_DIR", str(BASE_DIR / "runtime_voices"))).resolve()
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        for transcript in sorted(BUILTIN_DIR.glob("*.txt")):
            key = sanitize_name(transcript.stem)
            audio_path = transcript.with_suffix(".wav")
            if not audio_path.is_file():
                raise RuntimeError(f"Missing built-in voice audio: {audio_path}")
            ref_text = self._text(transcript.read_text(encoding="utf-8"), "ref_text", MAX_REF_TEXT_CHARS)
            self.builtin_refs[key] = (audio_path, ref_text)
            self._cache_prompt(key, self._create_prompt(audio_path, ref_text))
        if not self.builtin_refs:
            raise RuntimeError("No built-in voices; run prepare_assets.py before deployment")
        # Warm inference kernels before LitServe declares the worker ready.
        if os.getenv("WARMUP", "1") == "1":
            key = "am-othman" if "am-othman" in self.builtin_refs else next(iter(self.builtin_refs))
            with torch.inference_mode():
                self.model.generate(text="أهلاً بيك في حكاوي.", voice_clone_prompt=self._get_prompt(key))
        logger.info("Ready: %d built-in voices, sample_rate=%d, startup=%.2fs",
                    len(self.builtin_refs), self.sample_rate, time.perf_counter() - started)

    @staticmethod
    def _text(value, field, limit):
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field} must be a non-empty string")
        value = value.strip()
        if len(value) > limit:
            raise ValueError(f"{field} exceeds the {limit}-character limit")
        return value

    def _create_prompt(self, audio_path, ref_text):
        with torch.inference_mode():
            prompt = self.model.create_voice_clone_prompt(ref_audio=str(audio_path), ref_text=ref_text)
        # Cache reference tokens on CPU so many custom voices do not consume GPU VRAM.
        prompt.ref_audio_tokens = prompt.ref_audio_tokens.detach().cpu()
        return prompt

    def _cache_prompt(self, key, prompt):
        self.voice_cache[key] = prompt
        self.voice_cache.move_to_end(key)
        while len(self.voice_cache) > MAX_CACHED_VOICES:
            self.voice_cache.popitem(last=False)

    def _get_prompt(self, key):
        if key in self.voice_cache:
            self.voice_cache.move_to_end(key)
            return self.voice_cache[key]
        # A custom manifest, if present, is a complete locally saved reference.
        manifest = self.workspace_dir / f"{key}.json"
        if manifest.is_file():
            metadata = json.loads(manifest.read_text(encoding="utf-8"))
            audio_path = self.workspace_dir / metadata["audio_file"]
            if audio_path.parent.resolve() != self.workspace_dir:
                raise ValueError("Invalid cached audio path")
            ref_text = self._text(metadata["ref_text"], "ref_text", MAX_REF_TEXT_CHARS)
        elif key in self.builtin_refs:
            audio_path, ref_text = self.builtin_refs[key]
        else:
            return None
        prompt = self._create_prompt(audio_path, ref_text)
        self._cache_prompt(key, prompt)
        return prompt

    def _save_and_cache(self, key, audio_b64, ref_text):
        ref_text = self._text(ref_text, "ref_text", MAX_REF_TEXT_CHARS)
        wav = normalize_audio(decode_base64_audio(audio_b64), self.sample_rate)
        # Content-addressed audio plus an atomic manifest keeps voice updates consistent.
        digest = hashlib.sha256(wav + ref_text.encode("utf-8")).hexdigest()[:20]
        audio_path = self.workspace_dir / f"{key}-{digest}.wav"
        atomic_write(audio_path, wav)
        prompt = self._create_prompt(audio_path, ref_text)
        metadata = json.dumps({"audio_file": audio_path.name, "ref_text": ref_text}, ensure_ascii=False)
        atomic_write(self.workspace_dir / f"{key}.json", metadata.encode("utf-8"))
        self._cache_prompt(key, prompt)
        return prompt

    def decode_request(self, request):
        return request

    def predict(self, data):
        started = time.perf_counter()
        key = "unknown"
        try:
            if not isinstance(data, dict):
                raise ValueError("Request body must be a JSON object")
            action = data.get("action")
            if action not in {"save_character", "generate"}:
                raise ValueError("action must be 'generate' or 'save_character'")
            key = sanitize_name(data.get("char_name"))
            if action == "save_character":
                self._save_and_cache(key, data.get("audio_prompt"), data.get("ref_text"))
                return {"status": "success", "message": f"Character '{key}' saved!"}
            text = self._text(data.get("text"), "text", MAX_TEXT_CHARS)
            prompt = self._get_prompt(key)
            if prompt is None:
                if data.get("audio_prompt") and data.get("ref_text"):
                    prompt = self._save_and_cache(key, data["audio_prompt"], data["ref_text"])
                else:
                    # The Hakawi backend detects 'not found' and resends the reference.
                    return {"status": "error", "message": f"Character '{key}' not found and no reference audio provided."}
            with torch.inference_mode():
                generated = self.model.generate(text=text, voice_clone_prompt=prompt)
            waveform = generated[0] if isinstance(generated, (tuple, list)) else generated
            if hasattr(waveform, "cpu"):
                waveform = waveform.detach().cpu().numpy()
            waveform = np.asarray(waveform, dtype=np.float32)
            if waveform.ndim != 1 or not waveform.size or not np.isfinite(waveform).all():
                raise RuntimeError("Model returned an invalid waveform")
            output = io.BytesIO()
            sf.write(output, waveform, self.sample_rate, format="WAV", subtype="PCM_16")
            logger.info("Generated voice=%s characters=%d elapsed=%.2fs", key, len(text), time.perf_counter() - started)
            return {"status": "success", "audio_base64": base64.b64encode(output.getvalue()).decode("ascii")}
        except ValueError as exc:
            return {"status": "error", "message": str(exc)}
        except Exception:
            logger.exception("TTS failed for voice=%s", key)
            return {"status": "error", "message": "Speech generation failed; check the deployment logs."}

    def encode_response(self, output):
        return output


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    server = ls.LitServer(
        HakawiVoiceAPI(), accelerator="cuda", devices=1, workers_per_device=1,
        max_payload_size=16 * 1024 * 1024,
    )
    # Request timeouts retain LitServe defaults. Hakawi backend is unchanged.
    server.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")), generate_client_file=False)
