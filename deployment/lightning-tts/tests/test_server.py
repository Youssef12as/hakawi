"""CPU tests use real audio decoding and a fake GPU model; no model download."""
import base64
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

import numpy as np
import soundfile as sf

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE))
from audio_utils import decode_base64_audio, normalize_audio, sanitize_name


def wav_bytes(seconds=1, rate=24000, channels=1):
    wave = (np.sin(np.arange(int(rate * seconds)) * 2 * np.pi * 220 / rate) * 0.15).astype(np.float32)
    if channels == 2:
        wave = np.column_stack([wave, wave])
    out = io.BytesIO()
    sf.write(out, wave, rate, format="WAV", subtype="PCM_16")
    return out.getvalue()


class FakeTokens:
    def detach(self):
        return self

    def cpu(self):
        return self


class FakeModel:
    sampling_rate = 22050  # Different rate proves the output is not hardcoded.

    def __init__(self):
        self.prompt_calls = 0

    def create_voice_clone_prompt(self, **kwargs):
        self.prompt_calls += 1
        return types.SimpleNamespace(ref_audio_tokens=FakeTokens(), ref_text=kwargs["ref_text"])

    def generate(self, *, text, voice_clone_prompt):
        return [np.ones(22050, dtype=np.float32) * 0.1]

    def eval(self):
        return self


class AudioTests(unittest.TestCase):
    def test_safe_arabic_name_and_empty_names(self):
        self.assertEqual(sanitize_name("عم عثمان"), "عم_عثمان")
        for name in ["../", "???", None, "a" * 101]:
            with self.assertRaises(ValueError):
                sanitize_name(name)

    def test_base64_validation(self):
        for audio in ["%%%%", "", "data:audio/wav;base64,abcd"]:
            with self.assertRaises(ValueError):
                decode_base64_audio(audio)

    def test_real_wav_normalization(self):
        wav = normalize_audio(wav_bytes(rate=44100, channels=2))
        info = sf.info(io.BytesIO(wav))
        self.assertEqual((info.format, info.channels, info.samplerate), ("WAV", 1, 24000))

    def test_mp3_and_webm_by_content(self):
        for codec, container in [("libmp3lame", "mp3"), ("libopus", "webm")]:
            encoded = subprocess.run(
                [os.getenv("FFMPEG_BINARY", "ffmpeg"), "-hide_banner", "-loglevel", "error",
                 "-i", "pipe:0", "-c:a", codec, "-f", container, "pipe:1"],
                input=wav_bytes(), capture_output=True, check=True,
            ).stdout
            normalized = normalize_audio(encoded)
            self.assertEqual(sf.info(io.BytesIO(normalized)).format, "WAV")

    def test_invalid_long_silent_audio(self):
        out = io.BytesIO()
        sf.write(out, np.zeros(24000), 24000, format="WAV")
        for raw in [b"invalid audio", wav_bytes(seconds=31), out.getvalue()]:
            with self.assertRaises(ValueError):
                normalize_audio(raw)


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch = types.ModuleType("torch")
        torch.inference_mode = contextlib.nullcontext
        torch.float16 = "float16"
        torch.cuda = types.SimpleNamespace(is_available=lambda: True)
        litserve = types.ModuleType("litserve")
        class LitAPI:
            def __init__(self, **kwargs):
                self.config = kwargs
        litserve.LitAPI = LitAPI
        omnivoice = types.ModuleType("omnivoice")
        omnivoice.OmniVoice = types.SimpleNamespace(from_pretrained=lambda *a, **k: FakeModel())
        spec = importlib.util.spec_from_file_location("tts_server_under_test", BASE / "server.py")
        cls.server = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {"torch": torch, "litserve": litserve, "omnivoice": omnivoice}):
            spec.loader.exec_module(cls.server)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        model = root / "models"
        (model / "audio_tokenizer").mkdir(parents=True)
        for name in ["config.json", "model.safetensors", "audio_tokenizer/model.safetensors"]:
            (model / name).write_text("test fixture")
        voices = root / "voices"
        voices.mkdir()
        (voices / "am-othman.wav").write_bytes(wav_bytes())
        (voices / "am-othman.txt").write_text("أهلاً بيك", encoding="utf-8")
        self.addCleanup(patch.stopall)
        patch.object(self.server, "MODEL_DIR", model).start()
        patch.object(self.server, "BUILTIN_DIR", voices).start()
        patch.dict(os.environ, {"VOICE_CACHE_DIR": str(root / "runtime"), "WARMUP": "0"}).start()
        self.api = self.server.HakawiVoiceAPI()
        self.api.setup("cuda:0")

    def generate(self, key="am-othman", **extra):
        return self.api.predict({"action": "generate", "char_name": key, "text": "أهلاً", **extra})

    def test_builtin_prompt_reused_and_model_sample_rate(self):
        for _ in range(2):
            result = self.generate()
            self.assertEqual(result["status"], "success")
            info = sf.info(io.BytesIO(base64.b64decode(result["audio_base64"])))
            self.assertEqual(info.samplerate, 22050)
        self.assertEqual(self.api.model.prompt_calls, 1)

    def test_missing_voice_preserves_backend_retry_trigger(self):
        result = self.generate("new_voice")
        self.assertEqual(result["status"], "error")
        self.assertIn("not found", result["message"])

    def test_inline_clone_cached_and_restored_from_local_reference(self):
        result = self.generate("عم عثمان جديد", audio_prompt=base64.b64encode(wav_bytes()).decode(), ref_text="أهلاً")
        self.assertEqual(result["status"], "success")
        calls = self.api.model.prompt_calls
        self.assertEqual(self.generate("عم عثمان جديد")["status"], "success")
        self.assertEqual(self.api.model.prompt_calls, calls)
        self.api.voice_cache.clear()
        self.assertEqual(self.generate("عم عثمان جديد")["status"], "success")
        self.assertEqual(self.api.model.prompt_calls, calls + 1)

    def test_save_character_action(self):
        result = self.api.predict({"action": "save_character", "char_name": "test_voice",
                                   "audio_prompt": base64.b64encode(wav_bytes()).decode(), "ref_text": "أهلاً"})
        self.assertEqual(result["status"], "success")
        self.assertEqual(self.generate("test_voice")["status"], "success")

    def test_bad_inputs_and_failed_update_leave_existing_voice_usable(self):
        for payload in [None, {"action": "generate", "char_name": "../", "text": "hello"},
                        {"action": "generate", "char_name": "am-othman", "text": "a" * 2001}]:
            self.assertEqual(self.api.predict(payload)["status"], "error")
        result = self.api.predict({"action": "save_character", "char_name": "am-othman",
                                   "audio_prompt": "%%%", "ref_text": "أهلاً"})
        self.assertEqual(result["status"], "error")
        self.assertEqual(self.generate()["status"], "success")

    def test_cache_is_bounded_and_evicted_builtin_reloads(self):
        patch.object(self.server, "MAX_CACHED_VOICES", 2).start()
        for key in ["one", "two"]:
            self.assertEqual(self.generate(key, audio_prompt=base64.b64encode(wav_bytes()).decode(), ref_text="أهلاً")["status"], "success")
        self.assertEqual(len(self.api.voice_cache), 2)
        self.assertNotIn("am-othman", self.api.voice_cache)
        self.assertEqual(self.generate()["status"], "success")
        self.assertEqual(len(self.api.voice_cache), 2)


if __name__ == "__main__":
    unittest.main()
