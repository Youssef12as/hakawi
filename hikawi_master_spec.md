# Master System Prompt: Hikawi (حكاوي) Backend Architecture
**Role:** Expert AI/Backend Engineer  
**Context:** Building a FastAPI backend for an AI hackathon project called "Hikawi," an interactive map for oral heritage preservation. The system uses regional personas to talk to users in specific Egyptian dialects (e.g., Sa'idi, Nubian, Cairene).

## 1. The Core Pipeline Strategy
We are implementing a separated UI/UX flow to optimize latency during the live demo:
1. **User Input:** The user clicks a region on the frontend map (e.g., Aswan) and either sends a text message or records an audio message.
2. **Text Flow:** `Text -> Gemini 2.5 Flash -> Text Response`
3. **Audio Flow:** `Audio -> Speechmatics API (STT) -> Text -> Gemini 2.5 Flash -> Text Response`
4. **Playback (TTS Pipeline):** The frontend uses a custom hook (`useTTSPipeline`) to handle playback synchronously. For hardcoded interactions, it types out the text immediately while playing static audio. For dynamic responses, it processes the text sentence-by-sentence, calling the TTS API and synchronizing the audio playback with a progressive typing effect to minimize perceived latency.

---

## 2. Technical Stack & Dependencies
* **Framework:** FastAPI
* **LLM / RAG:** Google GenAI SDK (`gemini-2.5-flash`), ChromaDB (for regional historical context).
* **STT (Speech-to-Text):** Speechmatics API (via `requests`).
* **TTS (Text-to-Speech):** Lahgtna API (omnivoice-based fine-tune). Note: Voice cloning requires a reference audio file (`ref audio`) and a reference text (`ref text`).
* **Environment:** `python-dotenv`, `uvicorn`, `python-multipart`.

---

## 3. Required Endpoints

### A. `POST /api/chat/text`
* **Input:** JSON payload containing `text` (user's message) and `region` (e.g., "aswan").
* **Process:** 1. Retrieve relevant historical context from ChromaDB based on the `text` and `region`.
  2. Inject the region's `system_prompt`, the retrieved context, and the user's text into Gemini.
  3. Generate the response in the specific Egyptian dialect.
* **Output:** JSON `{"response": "نص الإجابة باللهجة المطلوبة"}`

### B. `POST /api/chat/audio`
* **Input:** `multipart/form-data` containing an audio `file` (OGG/WAV) and `region` (string).
* **Process:**
  1. Receive the audio file in memory (`io.BytesIO`) or save temporarily.
  2. Send to **Speechmatics API** (`POST https://asr.api.speechmatics.com/v2/jobs/`) with `config = '{"type": "transcription", "transcription_config": {"language": "ar"}}'`.
  3. Poll for completion. **CRITICAL:** When fetching the text result, you MUST set `response.encoding = 'utf-8'` before reading `response.text` to prevent Arabic text corruption.
  4. Pass the extracted text to the Gemini logic (same as Endpoint A).
* **Output:** JSON `{"transcribed_text": "ما قاله المستخدم", "response": "نرد جيميناي النصي"}`

### C. `POST /api/tts`
* **Input:** `multipart/form-data` or JSON containing `text` (Gemini's answer), and voice cloning requirements (`ref_audio` file and `ref_text`).
* **Process:**
  1. Send text along with `ref_audio` and `ref_text` to Lahgtna API for synthesis using voice cloning.
* **Output:** A `StreamingResponse` (media type: `audio/mpeg` or `audio/wav`) returning the raw audio bytes directly to the frontend.

---

## 4. Regional Data Mapping
Implement a dictionary to route prompts and Voice IDs dynamically based on the frontend request:

```python
REGIONAL_PERSONAS = {
    "aswan": {
        "name": "عم محمد",
        "ref_audio_path": "path/to/aswan_ref_audio.wav",
        "ref_text": "نص المرجع الصوتي لأسوان", 
        "system_prompt": "أنت عم محمد من أسوان، حارس التراث النوبي. تتحدث بلهجة أهل أسوان الطيبة، وتستخدم كلمات مثل 'يا ولدي'. إجابتك قصيرة ومبنية على المعلومات التاريخية المرفقة."
    },
    "cairo": {
        "name": "عم محمود",
        "ref_audio_path": "path/to/cairo_ref_audio.wav",
        "ref_text": "نص المرجع الصوتي للقاهرة",
        "system_prompt": "أنت عم محمود، راوي حكايات القاهرة الفاطمية. تتحدث بلهجة قاهرية أصيلة وسريعة."
    }
}
```

## 5. Security & Environment Variables
The `.env` file will contain:
```text
GEMINI_API_KEY=...
SPEECHMATICS_API_KEY=...
LAHGTNA_API_KEY=...
```

## Task
Please generate the complete, production-ready `main.py` integrating FastAPI, CORS middleware, the ChromaDB skeleton, and the three endpoints described above. Include robust error handling and ensure the Speechmatics UTF-8 polling loop is implemented correctly.
