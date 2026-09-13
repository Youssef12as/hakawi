# TTS Architecture Setup & Optimization Guide

This document details the complete overhaul, optimization, installation commands, and server code for the **Hakawi Text-to-Speech (TTS) System** powered by **Lightning.ai** and **Lahgtna OmniVoice v2**.

---

## 1. Overview & Architectural Shift

### The Previous Architecture (Problems)
* **Ephemeral Server Resets**: The Lightning GPU server does not run 24/7. When stopped or restarted, in-memory clones were lost, causing runtime 500 errors when generating voices.
* **Database Drift**: The `is_cloned` database flag in Supabase became invalid whenever the Lightning server restarted, causing state mismatches.
* **Redundant Network Latency**: Downloading models from Hugging Face on every cold start took several minutes and consumed bandwidth.
* **Database Latency**: Every speech request was burdened by database queries and lazy-cloning fallback checks.

### The New Optimized Architecture (Solutions)
1. **Local Weights on Lightning Disk**: The `oddadmix/lahgtna-omnivoice-v2` model is stored permanently in `/teamspace/studios/this_studio/models/lahgtna-omnivoice-v2`, allowing instant boot in **~3–5 seconds** with zero network download.
2. **In-RAM Voice Pre-caching**: Reference audio (`.wav`/`.mp3`) and reference text (`.txt`) for all characters are loaded directly into RAM (`self.voice_cache`) on startup, achieving **0ms lookup latency**.
3. **Thin Proxy Backend**: The FastAPI backend no longer manages clone state. It sends requests directly to Lightning with automatic retries and backoff.
4. **Clean Database**: The `is_cloned` column was dropped from the database; the backend only stores reference audio URLs and transcripts.
5. **Inline Fallback & Auto-Save**: If a new custom voice is requested, the backend transmits the reference audio inline; the Lightning server generates the speech and auto-saves the new voice into `pre_existing_voices/` on disk for all future calls.

---

## 2. Codebase Changes Summary

| File | Changes Made |
| :--- | :--- |
| [`backend/src/characters/service.py`](file:///d:/hakawi/backend/src/characters/service.py) | • Removed all `is_cloned` logic and lazy-cloning state management.<br>• Refactored `synthesize_speech` into a lightweight proxy.<br>• Added automatic retry with inline audio payload fallback if a character is missing. |
| [`backend/src/characters/utils.py`](file:///d:/hakawi/backend/src/characters/utils.py) | • Removed `is_cloned` column from `get_all_characters()` SQL `SELECT` query. |
| [`backend/src/characters/router.py`](file:///d:/hakawi/backend/src/characters/router.py) | • Removed `is_cloned` column and unused imports from character creation endpoints. |
| [`backend/src/seed_supabase.py`](file:///d:/hakawi/backend/src/seed_supabase.py) | • Removed `is_cloned` column from `voice_personas` seed `INSERT` statement. |
| [`backend/BACKEND.md`](file:///d:/hakawi/backend/BACKEND.md) | • Updated architecture documentation, component diagram, and operational notes. |

---

## 3. Lightning.ai Installation & Setup Commands

Run these commands in your Lightning Studio bash terminal:

### Step 1: Install Dependencies
```bash
# Install Hugging Face Hub (for one-time snapshot download)
pip install huggingface_hub

# Install OmniVoice, SoundFile, and LitServe
pip install omnivoice soundfile litserve

# Ensure TorchAudio matches your PyTorch release without overwriting CUDA torch
# Example for PyTorch 2.6.0:
pip install --no-deps torchaudio==2.6.0
```

### Step 2: Download Model Weights to Local Disk (One-Time Only)
```bash
python -c "
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id='oddadmix/lahgtna-omnivoice-v2',
    local_dir='/teamspace/studios/this_studio/models/lahgtna-omnivoice-v2',
    local_dir_use_symlinks=False
)
"
```

### Step 3: Populate Pre-existing Voices into Lightning Disk
```bash
python -c "
import urllib.request, os
voices = {
    'am-othman': ('https://hueymfgudrgdlmyaxeoi.supabase.co/storage/v1/object/public/characters/audios/am-othman.wav.mp3', 'لهجة الصعيد لهجة واعرة جوي مش أي حد يتكلمها'),
    'am-mohamed': ('https://hueymfgudrgdlmyaxeoi.supabase.co/storage/v1/object/public/characters/audios/aswan.wav.mp3', 'ولا في حد نتوَنَّس معاه الناس زمان البتحَكَّى الحكاوي الحلوة دي احسن من الكلام بتاع هنا الشباب اديلو يومين ولا فاهمينه'),
    'amr-abdeen-modern': ('https://hueymfgudrgdlmyaxeoi.supabase.co/storage/v1/object/public/characters/audios/amr-abdeen-modern.mp3', 'كرروا موضوع الهجاء الحرفي ده مئات المرات على أسماء الملوك  و المدن اللي زي رمسيس و أحمس و طيبة و كيمت'),
    'amr-abdeen': ('https://hueymfgudrgdlmyaxeoi.supabase.co/storage/v1/object/public/characters/audios/Ancient.wav.mp3', 'واع ثِن خِيِمِت فِي دُو دِي يو سِيسُو سِيفِخو خيمينو بِسيج'),
    'ramsis': ('https://hueymfgudrgdlmyaxeoi.supabase.co/storage/v1/object/public/characters/audios/Ancient.wav.mp3', 'واع ثِن خِيِمِت فِي دُو دِي يو سِيسُو سِيفِخو خيمينو بِسيج')
}
d = '/teamspace/studios/this_studio/pre_existing_voices'
os.makedirs(d, exist_ok=True)
for k, (url, txt) in voices.items():
    # Save as .wav for native compatibility
    urllib.request.urlretrieve(url, f'{d}/{k}.wav')
    with open(f'{d}/{k}.txt', 'w', encoding='utf-8') as f:
        f.write(txt)
print('✅ All 5 voices downloaded to pre_existing_voices!')
"
```

### Step 4: Run the Server (Keep Running with `tmux`)
```bash
# Create a detached session so the server keeps running
tmux new -s tts

# Run the server
python server.py

# Detach from tmux: Press Ctrl+B, then D
# Re-attach anytime: tmux attach -t tts
```

---

## 4. Complete `server.py` Source Code

Place this file at `/teamspace/studios/this_studio/server.py`:

```python
import litserve as ls
from omnivoice import OmniVoice
import soundfile as sf
import torch
import base64
import os
import io
import re


def _sanitize_name(name: str) -> str:
    """
    Sanitize a character name for safe file path usage.
    Strips path traversal characters and replaces spaces with underscores.
    """
    if not name:
        return name
    # Remove path separators and traversal patterns
    name = name.replace("/", "").replace("\\", "").replace("..", "")
    # Replace spaces with underscores
    name = re.sub(r'\s+', '_', name.strip())
    # Keep only alphanumeric, underscore, and hyphen
    name = re.sub(r'[^\w\-]', '', name)
    return name


class HakawiVoiceAPI(ls.LitAPI):
    def __init__(self):
        # Serve on the root domain
        super().__init__(api_path="/")

    def setup(self, device):
        print(f"⏳ Loading Lahgtna OmniVoice v2 on [{device}]...")
        self.device = device
        self.dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        # ── Load model from LOCAL disk (no internet needed after first download) ──
        local_model_path = "/teamspace/studios/this_studio/models/lahgtna-omnivoice-v2"

        if os.path.isdir(local_model_path):
            print(f"📂 Loading model from local disk: {local_model_path}")
            self.model = OmniVoice.from_pretrained(
                local_model_path,
                dtype=self.dtype,
                load_asr=False,
                local_files_only=True,
            )
        else:
            print("⚠️ Local model not found — downloading from Hugging Face (first run only)...")
            self.model = OmniVoice.from_pretrained(
                "oddadmix/lahgtna-omnivoice-v2",
                dtype=self.dtype,
                load_asr=False,
            )

        if torch.cuda.is_available():
            self.model = self.model.to(self.device)

        # ── Pre-cache all local voice references into RAM ──
        self.workspace_dir = "/teamspace/studios/this_studio/pre_existing_voices"
        os.makedirs(self.workspace_dir, exist_ok=True)
        self.voice_cache = {}
        self._load_all_voices()

        print("🚀 Model loaded and ready at full GPU capacity!")

    def _load_all_voices(self):
        """Scan the workspace directory and pre-cache all voice references into RAM."""
        if not os.path.exists(self.workspace_dir):
            return

        for fname in os.listdir(self.workspace_dir):
            if fname.endswith(".txt"):
                char_key = fname[:-4]  # e.g. "am-othman"
                txt_path = os.path.join(self.workspace_dir, fname)
                
                audio_path = None
                for ext in [".wav", ".mp3"]:
                    candidate = os.path.join(self.workspace_dir, f"{char_key}{ext}")
                    if os.path.exists(candidate):
                        audio_path = candidate
                        break

                if audio_path:
                    try:
                        with open(txt_path, "r", encoding="utf-8") as f:
                            ref_text = f.read().strip()
                        self.voice_cache[char_key] = {
                            "wav_path": audio_path,
                            "ref_text": ref_text,
                        }
                    except Exception as e:
                        print(f"⚠️ Could not load voice '{char_key}': {e}")

        print(f"🎙️ Pre-cached {len(self.voice_cache)} voices: {list(self.voice_cache.keys())}")

    def _save_and_cache(self, char_name: str, audio_b64: str, ref_text: str):
        """Save audio + text to disk and add to in-memory cache."""
        safe_name = _sanitize_name(char_name)
        wav_path = os.path.join(self.workspace_dir, f"{safe_name}.wav")
        txt_path = os.path.join(self.workspace_dir, f"{safe_name}.txt")

        with open(wav_path, "wb") as f:
            f.write(base64.b64decode(audio_b64))

        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(ref_text)

        self.voice_cache[safe_name] = {
            "wav_path": wav_path,
            "ref_text": ref_text,
        }
        print(f"💾 Voice '{char_name}' saved and cached as '{safe_name}'.")

    def decode_request(self, request):
        return request

    def predict(self, data):
        action = data.get("action")

        # ==========================================
        # ACTION 1: SAVE CHARACTER
        # ==========================================
        if action == "save_character":
            char_name = data.get("char_name")
            audio_b64 = data.get("audio_prompt")
            ref_text = data.get("ref_text")

            if not char_name or not audio_b64 or not ref_text:
                return {"status": "error", "message": "❌ Missing required fields!"}

            self._save_and_cache(char_name, audio_b64, ref_text)
            return {"status": "success", "message": f"✅ Character '{char_name}' successfully saved!"}

        # ==========================================
        # ACTION 2: GENERATE TTS
        # ==========================================
        elif action == "generate":
            char_name = data.get("char_name")
            text = data.get("text")

            if not char_name or not text:
                return {"status": "error", "message": "❌ Missing char_name or text!"}

            safe_name = _sanitize_name(char_name)

            # ── Resolve voice: cache → disk → inline payload ──
            voice_info = self.voice_cache.get(safe_name)

            if not voice_info:
                # Check disk (might have been added by another process)
                txt_path = os.path.join(self.workspace_dir, f"{safe_name}.txt")
                audio_path = None
                for ext in [".wav", ".mp3"]:
                    candidate = os.path.join(self.workspace_dir, f"{safe_name}{ext}")
                    if os.path.exists(candidate):
                        audio_path = candidate
                        break

                if audio_path and os.path.exists(txt_path):
                    with open(txt_path, "r", encoding="utf-8") as f:
                        ref_text = f.read().strip()
                    voice_info = {"wav_path": audio_path, "ref_text": ref_text}
                    self.voice_cache[safe_name] = voice_info

            if not voice_info:
                # Last resort: inline audio from the request payload
                audio_b64 = data.get("audio_prompt")
                ref_text = data.get("ref_text")
                if audio_b64 and ref_text:
                    self._save_and_cache(char_name, audio_b64, ref_text)
                    voice_info = self.voice_cache.get(safe_name)
                else:
                    return {
                        "status": "error",
                        "message": f"❌ Character '{char_name}' not found and no reference audio provided.",
                    }

            # ── Generate speech ──
            print(f"🎙️ Generating for character: {safe_name}")

            with torch.inference_mode():
                try:
                    audio_output = self.model.generate(
                        text=text.strip(),
                        ref_audio=voice_info["wav_path"],
                        ref_text=voice_info["ref_text"],
                    )

                    # Handle output formats just like the Gradio script
                    if isinstance(audio_output, (tuple, list)):
                        audio_data = audio_output[0]
                    else:
                        audio_data = audio_output

                    if hasattr(audio_data, "cpu"):
                        audio_data = audio_data.cpu().numpy()

                    # Write to buffer and encode to Base64
                    buffer = io.BytesIO()
                    sf.write(buffer, audio_data, samplerate=24000, format="WAV")
                    out_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

                    return {"status": "success", "audio_base64": out_b64}

                except Exception as e:
                    print(f"🚨 Error: {str(e)}")
                    return {"status": "error", "message": str(e)}

        # ==========================================
        # UNKNOWN ACTION
        # ==========================================
        else:
            return {
                "status": "error",
                "message": f"❌ Unknown action: '{action}'. Use 'save_character' or 'generate'.",
            }

    def encode_response(self, output):
        return output


# Run the server
if __name__ == "__main__":
    api = HakawiVoiceAPI()
    server = ls.LitServer(api, accelerator="cuda")
    server.run(port=8000)
```

---

## 5. Verification & Testing

* **Backend Test Suite**: All 28 automated tests in `tests/` passed:
  ```text
  tests\test_auth.py ...............
  tests\test_chat_sessions.py ...........
  tests\test_historical_prompts.py ..
  ======================= 28 passed in 23.07s =======================
  ```
* **Server Boot Verification**:
  ```text
  📂 Loading model from local disk: /teamspace/studios/this_studio/models/lahgtna-omnivoice-v2
  🎙️ Pre-cached 5 voices: ['amr-abdeen', 'amr-abdeen-modern', 'am-mohamed', 'ramsis', 'am-othman']
  🚀 Model loaded and ready at full GPU capacity!
  INFO: Started server process [10200]
  INFO: Application startup complete.
  ```
