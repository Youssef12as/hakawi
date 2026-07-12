# حكاوي — Hikawi 🏛️

> **صوت الماضي، حيّ في الحاضر**
> *The voice of the past, alive in the present*

AI platform preserving Egyptian oral heritage through interactive cultural characters that speak in regional dialects.

## ✨ Features

- 🗺️ **Heritage Map** — 27 governorates, each with its own character and dialect
- 🎤 **Voice Chat** — Speak with your voice, the character listens and responds
- ⚡ **Low-Latency TTS Pipeline** — Synchronized sentence-by-sentence audio playback and typing effect
- 𓀀 **Ancient Mode** — Switch to pharaonic characters speaking ancient Egyptian
- 📚 **Kids Mode** — Heritage told as interactive stories for children
- 👨‍👩‍👧‍👦 **Family Tree** — Preserve your grandparents' voice forever by uploading voice samples for instant cloning

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python) |
| AI | Gemini 2.5 Flash |
| Speech-to-Text | Speechmatics API |
| Text-to-Speech | Lahgtna: Omnivoice based fine tune (Voice cloning) |

---

## 🚀 Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10+)
- Git

### 1. Clone the repo

```bash
git clone https://github.com/Youssef12as/Hakawi-Front.git
cd Hakawi-Front
```

### 2. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Create `.env` file in `/backend`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SPEECHMATICS_API_KEY=your_speechmatics_key_here
GRADIO_TTS_URL=your_gradio_tts_url_here
```

> ⚠️ Ask the team lead for the API keys. Never commit `.env` to GitHub.

#### Run the backend:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be running at `http://localhost:8000`
- Health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

### 3. Setup Frontend

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

The app will be running at `http://localhost:5173`

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app + endpoints
│   ├── config.py            # Environment config (Pydantic)
│   ├── personas.py          # Regional character personas
│   ├── requirements.txt     # Python dependencies
│   └── services/
│       ├── gemini_service.py # Gemini 2.5 Flash integration
│       ├── stt_service.py   # Speechmatics STT
│       └── tts_service.py   # Gradio TTS voice cloning
│
├── frontend/
│   ├── public/
│   │   └── character/       # Character video files (idle + talking)
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # App pages (Landing, Map, Chat, Ancient)
│       ├── hooks/           # Custom React hooks (chat API, audio)
│       └── context/         # App-wide state
│
└── hikawi_master_spec.md    # Technical specification
```

## 🔗 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/chat/text` | Send text, get AI response |
| `POST` | `/api/chat/audio` | Send audio, get transcription + AI response |
| `POST` | `/api/tts` | Convert text to speech |
| `POST` | `/api/characters/add` | Add a new voice character |
| `GET` | `/api/characters` | List saved characters |

---

## 👥 Team

Cairo University × CU AI Nexus Hackathon 2026
