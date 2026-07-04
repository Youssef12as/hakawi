# Local XTTSv2 Streaming Migration Plan

## Problem
The current TTS architecture relies on a free cloud Gradio Space (`Lahgtna-Omnivoice`). This causes two critical issues for a live hackathon demo:
1. **Server Instability:** The cloud server frequently sleeps/restarts, wiping saved voices and throwing `Value: g is not in the list of choices` errors.
2. **Latency:** Cloud API calls introduce network lag, and the Gradio API does not easily support true streaming, causing unnatural delays.

## Solution
Migrate the TTS processing to the local machine (which has an RTX 4060 GPU) using `xtts-api-server`. This provides:
- **Zero server resets:** Complete control over the environment.
- **Ultra-low latency:** Natively utilizes the 8GB VRAM of the RTX 4060.
- **Local Voice Storage:** We will save voices to the hard drive, so they persist forever.

---

## User Prerequisites (Manual Setup)
Before I change the code, the user will need to run the local server.

1. Open a new terminal and run:
   ```bash
   pip install xtts-api-server
   ```
2. Start the server (it will download the model on the first run):
   ```bash
   python -m xtts_api_server
   ```
3. Update `.env`:
   Change `GRADIO_TTS_URL` to point to the local server (default is usually `http://localhost:8020` or `http://127.0.0.1:8020`).

---

## Proposed Code Changes

### [MODIFY] [tts_service.py](file:///c:/Users/asus/Downloads/Telegram%20Desktop/CU%20nexus%20first%20try/backend/services/tts_service.py)

We will completely rewrite this file to remove the `gradio_client` dependency and replace it with direct HTTP `requests` to the local XTTS API.

1. **Local Voice Storage:**
   Instead of uploading to Gradio, `save_character()` will save the `.wav` reference file to a local `backend/voices/` directory. This permanently prevents the "voice missing" error.

2. **XTTS API Integration:**
   `synthesize_speech()` will send a `POST` request to `http://localhost:8020/tts_to_audio/` (the standard XTTS endpoint).
   - Payload:
     ```json
     {
       "text": "<arabic_text>",
       "speaker_wav": "/absolute/path/to/backend/voices/character.wav",
       "language": "ar"
     }
     ```
   - It will save the resulting audio byte stream to a temp file or stream it directly back to the frontend.

### [MODIFY] [requirements.txt](file:///c:/Users/asus/Downloads/Telegram%20Desktop/CU%20nexus%20first%20try/backend/requirements.txt)
Remove `gradio_client` and ensure `requests` is present.

### [MODIFY] [app.js](file:///c:/Users/asus/Downloads/Telegram%20Desktop/CU%20nexus%20first%20try/frontend/app.js) (Optional tweak)
Because the XTTS server generates audio so fast on an RTX 4060, our existing `playSentencePipeline()` logic (which fetches chunks one by one) will functionally act as an ultra-fast streaming pipeline. We do not need to rewrite the frontend player, but we will ensure the error handling logic is cleaned up since Gradio errors won't exist anymore.

---

> [!IMPORTANT]
> ## Open Questions for User
> 
> 1. **Do you want me to proceed with rewriting `tts_service.py` right now while you install `xtts-api-server` in the background?** 
> 2. **Are you okay with storing the voice reference files (`.wav`) inside a `backend/voices/` folder?** This guarantees they are never lost when you restart the FastAPI server.

---

## Verification Plan
1. Ensure the user has `xtts-api-server` running.
2. Upload a new voice via the frontend. Verify it saves successfully to `backend/voices/`.
3. Send a message to the chatbot.
4. Verify that the audio plays almost instantly, chunk by chunk, without any Gradio server errors.
