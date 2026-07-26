# Hikawi (حكاوي) — Master System Specification v2.0

> **صوت الماضي، حيّ في الحاضر**  
> *The voice of the past, alive in the present*

**Last updated:** 2026-07-13  
**Status:** Production-ready — RAG fully integrated

---

## 1. Project Overview

**Hikawi** (حكاوي — "stories" in Egyptian Arabic) is an AI-powered interactive platform for preserving Egyptian oral heritage. Users explore an interactive map of Egypt, click on a governorate or a specific historical monument, and converse — via text or voice — with an AI character that embodies that region's dialect or a historical figure who built or lived at that monument.

The system operates in **two distinct modes**:

| Mode | Purpose | Persona Source | AI Grounding |
|---|---|---|---|
| **Regional Mode** | Chat with a living cultural character (e.g. عم عثمان from Aswan) who speaks the local dialect | `personas.py` | General knowledge + persona instructions |
| **Ancient Mode** | Chat with a historical figure (e.g. Ramses II at Abu Simbel) who responds in-character | `personas_historical.py` + `monuments_registry.py` | **RAG pipeline** — responses grounded strictly in retrieved monument research dossiers |

---

## 2. System Architecture — High-Level

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                       │
│  Landing → Map → Regional Chat  OR  Map → Monument → Ancient Mode   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ MapInteract│ │AncientMode│ │useChatApi │ │ useTTSPipeline       │ │
│  │(Leaflet)  │ │(RAG Chat) │ │(API hooks)│ │(sentence-level sync) │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────────┬──────────┘ │
│        │               │               │                   │          │
└────────┼───────────────┼───────────────┼───────────────────┼──────────┘
         │               │               │                   │
    ─────▼───────────────▼───────────────▼───────────────────▼──── HTTP ──
         │                                                            │
┌────────▼────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI + Python)                      │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  main.py      │  │  config.py   │  │  monuments_registry.py   │   │
│  │  (Endpoints)  │  │  (Settings)  │  │  (Map data, chips, GPS)  │   │
│  └──────┬────────┘  └──────────────┘  └──────────────────────────┘   │
│         │                                                            │
│  ┌──────▼──────────────────────  SERVICES  ──────────────────────┐   │
│  │                                                                │   │
│  │  gemini_service.py    → Gemini 2.5 Flash (generation)          │   │
│  │  rag_service.py       → In-memory cosine search + prompt build │   │
│  │  personas_historical  → 18 character personality definitions   │   │
│  │  stt_service.py       → Speechmatics batch STT                 │   │
│  │  tts_service.py       → Lightning TTS / Lahgtna voice cloning  │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────  DATA LAYER  ───────────────────────────┐   │
│  │  data/rag/monuments_data.txt   ← Raw research dossiers (717KB)│   │
│  │  data/rag/chunks.json          ← Chunked passages (850KB)     │   │
│  │  data/rag/embeddings.json      ← Pre-embedded vectors (18MB)  │   │
│  │  data/characters/              ← Voice reference clips + reg. │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technical Stack & Dependencies

### 3.1 Backend

| Component | Technology | Version | Why |
|---|---|---|---|
| **Framework** | FastAPI | ≥ 0.115 | Async-first Python web framework with auto-generated OpenAPI docs |
| **LLM** | Google GenAI SDK (`gemini-2.5-flash`) | ≥ 1.0 | Fastest Gemini model — balance of quality and latency for live demo |
| **Embeddings** | `gemini-embedding-001` | — | Same-provider embeddings avoid cross-model semantic drift |
| **Vector Store** | **In-memory numpy matrix** | — | ~424 chunks fit in RAM; single vectorized `matmul` is faster than any external DB for this scale |
| **STT** | Speechmatics Batch API v2 | — | Best Arabic dialect transcription accuracy among tested providers |
| **TTS** | Lahgtna / Lightning TTS API | — | Omnivoice-based fine-tune with voice cloning (ref audio + ref text) |
| **Config** | Pydantic Settings + `python-dotenv` | ≥ 2.0 | Type-safe env loading with `.env` support |
| **Server** | Uvicorn (ASGI) | ≥ 0.30 | Production-grade async server for FastAPI |
| **Serialization** | Pydantic v2 | ≥ 2.0 | Request/response validation and serialization |
| **HTTP client** | `requests` | ≥ 2.32 | Sync calls to Speechmatics & TTS APIs |
| **Math** | NumPy | ≥ 1.24 | Vectorized cosine similarity for RAG search |

### 3.2 Frontend

| Component | Technology | Version | Why |
|---|---|---|---|
| **UI Framework** | React | 18.3 | Component-based SPA |
| **Build Tool** | Vite | 6.0 | Sub-second HMR, fast builds |
| **Styling** | Tailwind CSS | 3.4 | Rapid prototyping with utility classes |
| **Routing** | React Router DOM | 6.28 | Multi-page SPA navigation |
| **Map** | Leaflet + react-leaflet | 1.9 / 4.2 | Interactive map of Egypt with monument markers |
| **Icons** | Lucide React | 0.460 | Consistent iconography |
| **IDs** | uuid | 11.0 | Session ID generation |

### 3.3 DevOps & Deployment

| Component | Technology | Details |
|---|---|---|
| **Container** | Docker | `python:3.10-slim` base image |
| **PaaS** | Render.com | `render.yaml` — auto-deploy Python web service |
| **Port** | 7860 (Docker) / `$PORT` (Render) | — |

---

## 4. Environment Variables

The backend requires these three keys in `backend/.env`:

```env
# Gemini (Google AI Studio) — https://aistudio.google.com/apikey
GEMINI_API_KEY=...

# Speechmatics batch STT — https://speechmatics.com/
SPEECHMATICS_API_KEY=...

# Lightning TTS / voice-cloning service (Lahgtna omnivoice fine-tune)
VOICE_API_URL=...
```

They are loaded via `config.py → pydantic_settings.BaseSettings` and consumed by every service module.

---

## 5. Data Pipeline — RAG Indexing (Offline)

The RAG index is built **offline** before the server starts, via two scripts in the repo root:

### 5.1 Step 1: Text Chunking — `prepare_data2.py`

**Input:** `backend/data/rag/monuments_data.txt` — a 717 KB file containing 18+ research dossiers about Egyptian monuments, each structured with Arabic numbered sections (١. ٢. ٣.).

**Process:**
1. Splits the raw text on `Research Dossier N` boundaries.
2. Within each dossier, identifies section breaks (Arabic numbered headings `١.` or Markdown `## N`).
3. Extracts: `monument` (first meaningful line), `builder` (after the em-dash `—`), and the section text (capped at 2000 chars).
4. Filters out chunks < 100 chars.

**Output:** `backend/data/rag/chunks.json` — ~424 structured chunks, each with:
```json
{
  "id": "m0_s1",
  "monument": "الهرم الأكبر — خوفو",
  "builder": "خوفو",
  "section": "١. المقدمة والسياق التاريخي",
  "text": "الهرم الأكبر — خوفو\n\n١. المقدمة والسياق التاريخي..."
}
```

### 5.2 Step 2: Embedding — `index_data.py`

**Input:** `chunks.json`

**Process:**
1. Filters chunks to ≥ 150 chars and ≤ 2 em-dashes (quality gate).
2. Calls `gemini-embedding-001` for each chunk's `text` field.
3. Rate-limits at 0.5s per call to avoid 429s.

**Output:** `backend/data/rag/embeddings.json` (~18 MB) — same structure as chunks, plus:
```json
{
  "embedding": [0.0123, -0.045, ...]  // 768-dim float vector
}
```

> **Why not ChromaDB?** The original spec mentioned ChromaDB, but it was replaced with a pure numpy in-memory approach. At 424 chunks (~18 MB), a single `(424, 768) @ (768,)` matrix multiply is instant (< 1ms) and has zero infrastructure overhead. This is a deliberate hackathon optimization.

---

## 6. RAG Service — Runtime Pipeline (`rag_service.py`)

This is the **core intelligence layer** of Ancient Mode. It bridges the precomputed embedding index and the Gemini generation model.

### 6.1 Lazy Loading

```python
# On first request (not import time):
_chunks = json.load("embeddings.json")          # list of dicts
_matrix = np.asarray([c["embedding"] ...])       # shape (N, 768)
_matrix = _matrix / norms                         # L2-normalize rows → cosine = dot product
_monument_indices = {name: [row_indices...]}     # for filtered search
```

**Why lazy?** The FastAPI app can start and serve `/health` even if `embeddings.json` is missing. Only RAG-dependent endpoints fail, with a clear 503 error.

### 6.2 Search — Cosine Similarity

```
user question → gemini-embedding-001 → L2-normalize → dot product vs _matrix → top-K
```

Two search modes:

| Mode | When | Behavior |
|---|---|---|
| **Filtered** | `monument_key` is set (user clicked a specific monument) | Only searches chunks belonging to that monument (`_monument_indices[name]`) |
| **Global** | No monument selected | Searches all 424 chunks |

Uses `np.argpartition` for O(N) partial sort instead of full sort.

### 6.3 Persona Resolution — `pick_persona()`

From the top-1 retrieved chunk, extracts the `monument` name and does a fuzzy match against `HISTORICAL_PERSONAS` (18 entries in `personas_historical.py`). Each persona defines:

| Field | Example (خوفو) |
|---|---|
| `tone` | ملكية، هادئة، ثقيلة، مهيبة. لا تشرح كثيرًا. |
| `language` | عربية فصحى ذات تركيب قديم. لا عامية. |
| `vocabulary` | الأفق، رع، ماعت، البيت الأبدي... |
| `on_unknown` | هذا لم يتركه لنا الحجر بيقين... |
| `example` | أنت ترى حجارة، أما أنا فكنت أرى أفقًا... |
| `avoid` | المزاح، العامية، ادعاء يقين في طريقة البناء... |

### 6.4 Prompt Assembly — `build_rag_prompt()`

Constructs a two-part prompt:

**System Prompt (anti-hallucination envelope):**
```
أنت محرك شخصيات تاريخية مصرية...
١. رد بالعربية فقط.
٢. استخدم فقط المعلومات الموجودة في النص المرجعي.
٣. لا تخترع أسماء أو تواريخ أو أحداثًا غير موجودة في النص.
٤. تكلم بضمير المتكلم كشخصية حقيقية...
٥. اكتب فقرتين واضحتين...
٦. الرد بالكامل بين ٩٠ و١٢٠ كلمة تقريبًا.

تعليمات الشخصية:
النبرة: {tone}
اللغة: {language}
...
```

**User Prompt (context-injected question):**
```
أنت شخصية تاريخية من {monument}.
اسمك أو دورك: {builder}.

النص المرجعي:
{top-K chunks joined by ---}

سؤال الزائر: {question}

ردك كشخصية (فقرتين واضحتين، جمل قصيرة ومباشرة):
```

### 6.5 Generation — `generate_rag_response()`

| Parameter | Value | Rationale |
|---|---|---|
| `temperature` | 0.4 | Low creativity → high faithfulness to retrieved context |
| `max_output_tokens` | 320 | ≈ 90–120 Arabic words (2 paragraphs) |
| `thinking_budget` | 0 | Disables Gemini's chain-of-thought to minimize latency |

---

## 7. Monuments Registry (`monuments_registry.py`)

The **single source of truth** for everything displayed on the frontend map. Contains:

### 7.1 Governorates (4 regions)

| Key | Name (AR) | Name (EN) | Lat/Lng |
|---|---|---|---|
| `aswan` | أسوان والنوبة | Aswan & Nubia | 24.09, 32.90 |
| `luxor` | الأقصر وطيبة | Luxor & Thebes | 25.69, 32.64 |
| `cairo` | القاهرة والجيزة | Cairo & Giza | 30.04, 31.24 |
| `alexandria` | الإسكندرية | Alexandria | 31.20, 29.92 |

### 7.2 Monuments (18 total)

Each monument entry includes:

```python
{
    "key": "abu-simbel",                          # URL-safe slug
    "governorate": "aswan",                       # parent region
    "monument_name": "أبو سمبل — رمسيس الثاني",  # MUST match chunk["monument"] in RAG index
    "display_name": "أبو سمبل",                   # UI label
    "builder": "رمسيس الثاني",                    # character name
    "title": "فرعون مصر العظيم",                  # subtitle
    "bio": "...",                                   # first-person intro
    "lat": 22.3436, "lng": 31.6256,               # GPS for map pin
    "character_name": "am-othman",                 # TTS voice ID
    "chips": ["حدثني عن معركة قادش", ...],         # suggested quick-reply questions
}
```

**Critical design decision:** `monument_name` is the join key between the registry and the RAG chunks. When a user clicks a monument on the map, the backend passes `monument_name` to `rag_service.search()` to constrain retrieval to that monument's chunks only. This prevents the RAG from "discovering" a different monument's content.

---

## 8. Regional Personas (`personas.py`)

Defines the **living cultural characters** for Regional Mode. Currently one persona is fully authored:

### عم عثمان (Aswan)

- **Character name:** `am-othman`
- **Voice reference:** `data/characters/am-othman.wav.mp3` + reference text
- **System prompt features:**
  - Strict anti-hallucination rules (6 numbered rules in Arabic)
  - TTS formatting instructions (sentence length ≤ 15–20 words, breathing pauses, selective diacritics)
  - Knowledge scope limited to documented Aswan landmarks

Other regions (luxor, cairo, alexandria) **fall back** to the Aswan persona with a logged warning — the fallback keeps the demo functional while new personas are being authored.

---

## 9. API Endpoints

### 9.1 Health & Discovery

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{status, service, rag_ready}` — `rag_ready` indicates if the RAG index loaded successfully |
| `GET` | `/api/governorates` | Returns all governorates with their nested monuments (chips, GPS, character info) |

### 9.2 Regional Mode — Dialect Chat

#### `POST /api/chat/text`

| Field | Type | Default | Description |
|---|---|---|---|
| `text` | string | required | User's message in Arabic |
| `session_id` | string | auto-UUID | Conversation session (persists history) |
| `region` | string | `"aswan"` | Region key for persona lookup |

**Pipeline:** `text → persona system_prompt → Gemini 2.5 Flash (temp=0.8, 500 tokens) → dialect response`

**Response:** `{response, session_id, region}`

#### `POST /api/chat/audio`

| Field | Type | Description |
|---|---|---|
| `file` | UploadFile | Audio file (WebM/OGG/WAV/MP3/M4A) |
| `session_id` | Form string | Conversation session |
| `region` | Form string | Region key |

**Pipeline:** `audio → Speechmatics STT (Arabic, batch) → transcribed text → (same as /chat/text) → dialect response`

**Response:** `{transcribed_text, response, session_id, region}`

#### `POST /api/stt`

| Field | Type | Description |
|---|---|---|
| `file` | UploadFile | Audio file |

**Pipeline:** `audio → Speechmatics STT → text only` (no AI generation — for preview before sending)

**Response:** `{text}`

### 9.3 Ancient Mode — RAG-Grounded Historical Chat

#### `POST /api/chat/ancient`

| Field | Type | Default | Description |
|---|---|---|---|
| `text` | string | required | User's question about the monument |
| `session_id` | string | auto-UUID | Conversation session |
| `top_k` | int | 4 | Number of chunks to retrieve |
| `monument_key` | string | null | Monument slug (e.g. `"abu-simbel"`) — constrains RAG search |

**Full pipeline:**

```
user question
  → Gemini embedding (gemini-embedding-001)
  → L2-normalize query vector
  → cosine-similarity search over embeddings.json
    (constrained to monument_key if provided)
  → top-K chunks retrieved
  → pick historical persona for that monument
  → assemble anti-hallucination system prompt + persona instructions
  → inject retrieved context + question into user prompt
  → Gemini 2.5 Flash (temp=0.4, 320 tokens, thinking_budget=0)
  → Arabic reply in-character (2 paragraphs, 90–120 words)
```

**Response:**
```json
{
  "response": "نحتُّ وجهي أربع مرات في الجبل...",
  "session_id": "uuid",
  "monument": "أبو سمبل — رمسيس الثاني",
  "builder": "رمسيس الثاني",
  "persona_key": "أبو سمبل — رمسيس الثاني",
  "display_name": "أبو سمبل",
  "character_name": "am-othman"
}
```

### 9.4 Text-to-Speech

#### `POST /api/tts`

| Field | Type | Description |
|---|---|---|
| `text` | string | Text to synthesize |
| `character_name` | string | TTS voice ID (e.g. `"am-othman"`) |

**Pipeline:**
1. Look up voice reference (ref audio + ref text) from:
   - `personas.py` (regional characters), or
   - `data/characters/registry.json` (user-uploaded characters)
2. If character not yet saved to the TTS model, **lazy-load**: read local reference files and call `save_character` first.
3. Send `{action: "generate", text, char_name, audio_prompt (base64), ref_text}` to Lightning TTS API.
4. Decode returned `audio_base64` → write to temp `.wav` file.

**Response:** `FileResponse` with `audio/wav` MIME type.

### 9.5 Character Management

#### `POST /api/characters/add`

| Field | Type | Description |
|---|---|---|
| `char_name` | Form string | Character name |
| `ref_text` | Form string | Text spoken in the reference clip |
| `audio_file` | UploadFile | Reference audio clip |

**Process:**
1. Saves audio locally to `data/characters/{name}.webm`.
2. Updates `data/characters/registry.json` with `{ref_text, ref_audio_path}`.
3. Calls TTS API to `save_character` for the voice cloning model.

#### `GET /api/characters`

Returns `{characters: ["am-othman", ...]}` — list of all saved voice IDs.

---

## 10. Gemini Service (`gemini_service.py`)

Centralizes all LLM generation with a shared retry wrapper.

### 10.1 Retry Logic — `_generate_with_retry()`

- **Max retries:** 3
- **Backoff:** `2s × attempt` (linear)
- **Rate limit detection:** If `429` or `RESOURCE_EXHAUSTED` in error string → immediately raises `ValueError` with Arabic user-facing message (no retry)
- **All other errors:** Retries up to 3 times, then raises `RuntimeError`

### 10.2 Two Generation Paths

| Function | Used By | Temperature | Max Tokens | Thinking | History |
|---|---|---|---|---|---|
| `generate_response()` | Regional chat (text + audio) | 0.8 | 500 | Default | ✅ Multi-turn |
| `generate_rag_response()` | Ancient Mode | 0.4 | 320 | 0 (disabled) | ❌ Single-turn |

**Why no history in Ancient Mode?** Each RAG query is self-contained — the retrieved context changes per question, so multi-turn history would mix contexts from different chunks. The persona-injection approach provides continuity instead.

---

## 11. STT Service (`stt_service.py`)

### Speechmatics Batch API v2

**Pipeline:**
1. **Submit job:** `POST https://asr.api.speechmatics.com/v2/jobs/` with `config.transcription_config.language = "ar"`.
2. **Poll for completion:** GET job status every 1s, up to 60 attempts.
3. **Fetch transcript:** GET `/jobs/{id}/transcript` → extract `results[].alternatives[].content` and join.

**Critical implementation detail:**
```python
response.encoding = "utf-8"  # MUST set before reading response.text
```
Without this, the `requests` library may auto-detect a wrong encoding, **corrupting Arabic text**.

**Supported audio formats:** `.webm`, `.ogg`, `.wav`, `.mp3`, `.m4a`  
**Default content type:** `audio/webm` (browser `MediaRecorder` default)

---

## 12. TTS Service (`tts_service.py`)

### Lightning TTS / Lahgtna API

**Two operations via a unified REST endpoint:**

| Action | Payload | Response |
|---|---|---|
| `save_character` | `{action, char_name, audio_prompt (base64), ref_text}` | `{status, message}` |
| `generate` | `{action, text, char_name, audio_prompt?, ref_text?}` | `{status, audio_base64}` |

**Lazy character loading:** If a character hasn't been saved to the TTS model yet (`char_name not in saved_characters`), the service:
1. Looks up `ref_audio_path` and `ref_text` from either `personas.py` or `data/characters/registry.json`.
2. Reads the local audio file and calls `save_character` automatically.
3. Then proceeds with generation.

This ensures the first TTS call for any character "just works" without manual pre-registration.

---

## 13. Conversation Memory

### In-Memory LRU Store

```python
MAX_SESSIONS = 256
conversation_history: OrderedDict[str, list[dict]] = OrderedDict()
```

- **Key:** `session_id` (UUID)
- **Value:** List of `{role: "user"/"model", parts: [{text: "..."}]}`
- **Eviction:** When sessions exceed 256, oldest-first (`popitem(last=False)`)
- **MRU promotion:** Active sessions are moved to the end (`move_to_end`)

Used by **Regional Mode only** — Ancient Mode is stateless per query.

---

## 14. Frontend Architecture

### 14.1 Pages & Routes

| Route | Page Component | Description |
|---|---|---|
| `/` | `LivingWall` | Landing page / heritage wall |
| `/map` | `MapInteract` | Interactive Egypt map with governorate & monument markers |
| `/ancient/:regionId` | `AncientMode` | RAG-powered historical character chat |
| `/family` | `FamilyTree` | Family voice preservation (voice cloning upload) |
| `/settings` | `Settings` | App settings and character management |

### 14.2 Custom Hooks

#### `useChatApi()` — API Communication Layer

Centralizes all backend calls with loading/error state management:

| Function | Endpoint | Mode |
|---|---|---|
| `sendTextMessage(text, sessionId, region)` | `POST /api/chat/text` | Regional |
| `sendAudioMessage(blob, sessionId, region)` | `POST /api/chat/audio` | Regional |
| `sendAncientMessage(text, sessionId, monumentKey)` | `POST /api/chat/ancient` | Ancient |
| `fetchTTS(text, characterName)` | `POST /api/tts` | Both |
| `fetchGovernorates()` | `GET /api/governorates` | Map |

#### `useTTSPipeline()` — Sentence-Level Audio Synchronization

This is the key UX innovation for minimizing **perceived latency**:

```
Full AI response text
  → splitIntoBreathGroups() (sentence splitting)
  → For each sentence:
      1. Await this sentence's TTS audio blob
      2. Start prefetching NEXT sentence's audio (overlap)
      3. Play audio + progressive typing simultaneously:
         - msPerChar = audio.duration * 1000 / sentence.length
         - Type one character every msPerChar
         - Typing finishes when audio ends
```

**Key features:**
- **Audio prefetching:** While sentence N plays, sentence N+1 is already being fetched → eliminates inter-sentence gap.
- **Synchronized typing:** Characters appear in time with the audio duration, creating a "reading aloud" effect.
- **Stop controls:** `stopPlaybackRef` allows immediate interruption.
- **Static audio support:** `playStaticAudio()` for pre-recorded responses (chips).
- **Blob-based playback:** Audio is fetched as blobs and played via `URL.createObjectURL()` to bypass browser download managers (IDM workaround).

#### `useCharacterState()` — Character Selection State

Manages the currently selected voice character across the app.

#### `useConsent()` — User Consent

Manages user consent state for voice recording.

### 14.3 Component Architecture

```
src/
├── components/
│   ├── character/    # Character video/avatar display
│   ├── chat/         # Chat bubble, message list, input
│   ├── common/       # Shared UI primitives
│   ├── consent/      # Recording consent dialog
│   ├── layout/       # Navbar, page layout
│   ├── map/          # Leaflet map components
│   └── record/       # Audio recording controls
├── context/
│   └── AppContext.jsx  # Global app state provider
├── hooks/            # Custom hooks (see above)
├── pages/            # Route-level page components
└── utils/
    └── textUtils.js  # Arabic text utilities (breath group splitting)
```

### 14.4 Dev Server Proxy

Vite proxies `/api/*` requests to `http://localhost:8000` during development, so the frontend can call the backend without CORS issues:

```javascript
// vite.config.js
proxy: {
  '/api': { target: 'http://localhost:8000', changeOrigin: true }
}
```

---

## 15. Data Flow Diagrams

### 15.1 Regional Mode — Text Chat

```
User types message
  │
  ▼
Frontend: useChatApi.sendTextMessage(text, sessionId, "aswan")
  │
  ▼
POST /api/chat/text  {text, session_id, region}
  │
  ├──→ personas.get_persona("aswan")  →  system_prompt
  ├──→ get_history(session_id)         →  conversation history
  │
  ▼
gemini_service.generate_response(text, system_prompt, history)
  │
  ├──→ contents = history + [{role: "user", text}]
  ├──→ Gemini 2.5 Flash (temp=0.8, 500 tokens)
  │
  ▼
Response → append to history → return {response, session_id, region}
  │
  ▼
Frontend: display message + useTTSPipeline for audio
```

### 15.2 Ancient Mode — RAG Chat

```
User clicks monument "abu-simbel" → types question
  │
  ▼
Frontend: useChatApi.sendAncientMessage(text, sessionId, "abu-simbel")
  │
  ▼
POST /api/chat/ancient  {text, session_id, monument_key: "abu-simbel"}
  │
  ├──→ monuments_registry.get_monument_by_key("abu-simbel")
  │      → monument_name = "أبو سمبل — رمسيس الثاني"
  │      → display_name = "أبو سمبل"
  │      → character_name = "am-othman"
  │
  ▼
rag_service.retrieve_and_build(text, top_k=4, monument_name="أبو سمبل — رمسيس الثاني")
  │
  ├──→ _embed_query(text)  →  768-dim query vector (L2-normalized)
  ├──→ search():
  │      → _monument_indices["أبو سمبل — رمسيس الثاني"] → row indices
  │      → sub_matrix[indices] @ query → cosine scores
  │      → argpartition → top-4 chunks
  │
  ├──→ pick_persona(chunks):
  │      → top chunk monument = "أبو سمبل — رمسيس الثاني"
  │      → fuzzy match → HISTORICAL_PERSONAS["أبو سمبل — رمسيس الثاني"]
  │      → persona with tone, language, vocabulary, etc.
  │
  ├──→ build_rag_prompt():
  │      → system_prompt = anti-hallucination rules + persona instructions
  │      → user_prompt = monument + builder + context + question
  │
  ▼
gemini_service.generate_rag_response(user_prompt, system_prompt)
  │
  ├──→ Gemini 2.5 Flash (temp=0.4, 320 tokens, thinking=0)
  │
  ▼
Return {response, session_id, monument, builder, persona_key, display_name, character_name}
  │
  ▼
Frontend: display response + TTS pipeline with character_name voice
```

### 15.3 Audio Chat Flow

```
User records voice message
  │
  ▼
Frontend: MediaRecorder → WebM blob
  │
  ▼
POST /api/chat/audio  (multipart: file + session_id + region)
  │
  ├──→ stt_service.transcribe_audio(audio_bytes, "recording.webm")
  │      → Speechmatics: submit job → poll status → fetch transcript
  │      → CRITICAL: response.encoding = "utf-8" before reading
  │
  ├──→ (same as text chat from here)
  │
  ▼
Return {transcribed_text, response, session_id, region}
```

### 15.4 TTS Sentence Pipeline

```
AI response: "نحتُّ وجهي أربع مرات. هنا في النوبة، حيث تلتقي الشمس."
  │
  ▼
splitIntoBreathGroups() → ["نحتُّ وجهي أربع مرات.", "هنا في النوبة، حيث تلتقي الشمس."]
  │
  ▼
Sentence 0: fetch TTS audio →→→→→→→→→→ [audio blob]
Sentence 1: (prefetch starts)           │
                                         │
  ▼                                      ▼
Play sentence 0 audio ←─── sync ───→ Type characters one-by-one
  │                                   "ن" → "نح" → "نحت" → ...
  │
  ▼ (audio ends)
Sentence 1: audio already fetched! → play immediately → type
  │
  ▼ (audio ends)
Done → display full text
```

---

## 16. Anti-Hallucination Strategy

Hikawi employs a **defense-in-depth** approach against AI hallucination:

| Layer | Mechanism | Where |
|---|---|---|
| **1. Data grounding** | RAG retrieves only verified research dossier text | `rag_service.search()` |
| **2. System prompt** | Explicit 6-rule Arabic instruction set forbidding invention | `rag_service.build_rag_prompt()` |
| **3. Persona guardrails** | Each persona has an `on_unknown` phrase and an `avoid` list | `personas_historical.py` |
| **4. Low temperature** | `temp=0.4` for Ancient Mode reduces creative divergence | `gemini_service.py` |
| **5. Token limit** | 320 max tokens prevents long rambling answers | `gemini_service.py` |
| **6. Monument filtering** | When a monument is selected, search is constrained to its chunks only | `rag_service.search()` |

---

## 17. Project File Structure (Complete)

```
Hakawi/
├── hikawi_master_spec.md           # ← THIS FILE
├── README.md                        # Setup instructions
├── rag_explanation.md               # RAG system documentation (Arabic)
├── render.yaml                      # Render.com deployment config
│
├── prepare_data2.py                 # Offline: monuments_data.txt → chunks.json
├── index_data.py                    # Offline: chunks.json → embeddings.json
│
├── backend/
│   ├── main.py                      # FastAPI app, endpoints, session store
│   ├── config.py                    # Pydantic Settings (.env loader)
│   ├── personas.py                  # Regional living character personas
│   ├── monuments_registry.py        # Map data: 4 governorates, 18 monuments
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Docker container config
│   ├── Procfile                     # Render start command
│   ├── .env / .env.example          # Environment variables
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_service.py        # Gemini 2.5 Flash: generate + RAG generate
│   │   ├── rag_service.py           # RAG: embed, search, build prompt
│   │   ├── personas_historical.py   # 18 historical character definitions
│   │   ├── stt_service.py           # Speechmatics Arabic STT
│   │   └── tts_service.py           # Lightning TTS voice cloning
│   │
│   └── data/
│       ├── rag/
│       │   ├── monuments_data.txt   # Raw research dossiers (717 KB)
│       │   ├── chunks.json          # Chunked passages (850 KB)
│       │   └── embeddings.json      # Pre-embedded vectors (18 MB)
│       └── characters/
│           ├── am-othman.wav.mp3    # Reference audio for voice cloning
│           └── registry.json        # Character voice registry
│
└── frontend/
    ├── package.json                 # Node dependencies
    ├── vite.config.js               # Vite + proxy config
    ├── tailwind.config.js           # Tailwind theme
    ├── index.html                   # SPA entry point
    ├── style.css                    # Global styles
    ├── app.js                       # Legacy chat logic (standalone)
    │
    ├── public/
    │   ├── assets/                  # Static images
    │   ├── audio/                   # Pre-recorded audio clips
    │   └── character/               # Character video files (idle + talking)
    │
    └── src/
        ├── main.jsx                 # React entry point
        ├── App.jsx                  # Router + layout
        ├── index.css                # Tailwind base + custom styles
        │
        ├── components/
        │   ├── character/           # Avatar/video display
        │   ├── chat/                # Message bubbles, input
        │   ├── common/              # Shared UI components
        │   ├── consent/             # Voice recording consent
        │   ├── layout/              # Navbar
        │   ├── map/                 # Leaflet map components
        │   └── record/              # Audio recording UI
        │
        ├── context/
        │   └── AppContext.jsx       # Global state provider
        │
        ├── hooks/
        │   ├── useChatApi.js        # API communication layer
        │   ├── useTTSPipeline.js    # Sentence-level TTS sync
        │   ├── useCharacterState.js # Character selection state
        │   └── useConsent.js        # Consent state
        │
        ├── pages/
        │   ├── Landing.jsx          # Home / heritage wall
        │   ├── MapInteract.jsx      # Interactive Egypt map
        │   ├── AncientMode.jsx      # RAG historical chat
        │   ├── FamilyTree.jsx       # Voice preservation
        │   ├── LivingWall.jsx       # Cultural stories wall
        │   ├── RecordPreserve.jsx   # Record & preserve voices
        │   └── Settings.jsx         # App settings
        │
        └── utils/
            └── textUtils.js         # Arabic text utils (breath groups)
```

---

## 18. Quick Start

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Create .env with GEMINI_API_KEY, SPEECHMATICS_API_KEY, VOICE_API_URL
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

### Rebuild RAG Index (if `monuments_data.txt` changes)

```bash
# From repo root:
set GEMINI_API_KEY=your_key
python prepare_data2.py          # → backend/data/rag/chunks.json
python index_data.py             # → backend/data/rag/embeddings.json
```

---

## 19. Key Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| **In-memory numpy instead of ChromaDB/Pinecone** | 424 chunks → ~18 MB. A single matmul is < 1ms. Zero infra overhead for hackathon. |
| **Lazy RAG loading** | Server starts fast; only RAG endpoints fail if index is missing. `/health` always works. |
| **Separate generation functions** | Regional chat needs multi-turn history + higher creativity (temp=0.8). Ancient mode needs single-turn grounding + low creativity (temp=0.4). |
| **Monument filtering via pre-built index** | `_monument_indices` is O(filtered) not O(N) — avoids scanning all 424 chunks when a specific monument is selected. |
| **Persona fuzzy matching** | Monument names in chunks sometimes vary slightly from registry keys. Token-based matching (words > 2 chars) handles this gracefully. |
| **TTS sentence prefetching** | Eliminates inter-sentence audio gaps. User perceives continuous speech even though each sentence is a separate API call. |
| **Thinking budget = 0 for RAG** | Chain-of-thought adds 1–3s latency. For a grounded 2-paragraph answer, it's unnecessary. |
| **Fallback personas** | Regions without authored personas silently use Aswan's persona. Demo never breaks. |
| **Blob-based audio playback** | `URL.createObjectURL()` bypasses Internet Download Manager (IDM) and similar browser extensions that intercept direct audio URLs. |
| **UTF-8 encoding on Speechmatics responses** | `requests` library may auto-detect wrong encoding for Arabic text. Explicit `response.encoding = "utf-8"` prevents corruption. |
