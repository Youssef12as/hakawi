# Hikawi (حكاوي) — Project Reading Walkthrough 🗺️

Welcome to the Hikawi project! If you're a new developer looking to understand how the system works, this guide will walk you through the codebase in the logical order of execution. 

We recommend reading the files in the sequence presented below to understand how the React frontend interacts with the FastAPI backend, and how our RAG and AI pipelines function.

*(Note: `frontend/dist/` was already present in our `.gitignore` file, so no updates were needed there).*

---

## 1. Entry Points 🚀

Start here to see how both applications bootstrap.

* **Frontend:**
  1. [`frontend/src/main.jsx`](frontend/src/main.jsx) — Mounts the React app and context providers.
  2. [`frontend/src/App.jsx`](frontend/src/App.jsx) — Defines the routing map (React Router). Shows public vs. protected routes.
* **Backend:**
  3. [`backend/src/main.py`](backend/src/main.py) — The FastAPI entry point. Notice how routers (`chat`, `governorates`, `characters`, etc.) are included here.

---

## 2. Global State & Auth 🔒

Understanding how user state is managed is critical before looking at the UI.

4. [`frontend/src/context/AuthContext.jsx`](frontend/src/context/AuthContext.jsx) — Supabase authentication state. Handles login, signup, session restoration, and token management.
5. [`frontend/src/context/AppContext.jsx`](frontend/src/context/AppContext.jsx) — Simple global app state (like active region/language).
6. [`frontend/src/components/auth/ProtectedRoute.jsx`](frontend/src/components/auth/ProtectedRoute.jsx) — The wrapper component that protects private pages from unauthenticated access.

---

## 3. The Core User Journey (Frontend) 🖥️

Follow the primary user flow: from landing page, to the map, and into a chat.

7. **Landing:** [`frontend/src/pages/Landing.jsx`](frontend/src/pages/Landing.jsx) — The majestic, animated homepage.
8. **Map View:** [`frontend/src/pages/MapInteract.jsx`](frontend/src/pages/MapInteract.jsx) — The main interaction hub.
   - It relies heavily on [`frontend/src/components/map/DialectMap.jsx`](frontend/src/components/map/DialectMap.jsx) (the interactive SVG map).
   - And [`frontend/src/components/map/MonumentSelector.jsx`](frontend/src/components/map/MonumentSelector.jsx) (drilling down into specific historical monuments).
9. **Chat Modes:**
   - **Ancient Mode (RAG):** [`frontend/src/pages/AncientMode.jsx`](frontend/src/pages/AncientMode.jsx) — Chatting with historical figures (e.g. Ramses).
   - **Chat UI Components:** Explore [`frontend/src/components/chat/ChatPanel.jsx`](frontend/src/components/chat/ChatPanel.jsx) and [`frontend/src/components/chat/ChatInput.jsx`](frontend/src/components/chat/ChatInput.jsx).
10. **The Brains of Frontend Chat:**
   - [`frontend/src/hooks/useChatApi.js`](frontend/src/hooks/useChatApi.js) — The hook managing API calls, streaming responses, and managing the active session.
   - [`frontend/src/hooks/useTTSPipeline.js`](frontend/src/hooks/useTTSPipeline.js) — Handles synchronized audio playback and text typing for the AI responses.

---

## 4. The Backend Brain (API & AI Pipeline) 🧠

When the frontend sends a chat message, here's how the backend processes it.

11. **The Chat Router:** [`backend/src/chat/router.py`](backend/src/chat/router.py) — Look at the `/api/chat/text` and `/api/chat/audio` endpoints.
12. **The Chat Service:** [`backend/src/chat/service.py`](backend/src/chat/service.py) — The orchestrator. It manages database insertion for `chat_sessions` and `chat_messages` (storing questions and responses), and invokes the AI models.
13. **RAG Pipeline (Retrieval-Augmented Generation):**
    - [`backend/src/chat/rag_service.py`](backend/src/chat/rag_service.py) — **Crucial File**. This is where we embed the user's query, search our in-memory vector embeddings (from `backend/data/rag/`), and construct the context.
    - [`backend/src/chat/historical_prompts.py`](backend/src/chat/historical_prompts.py) — The system prompts driving the AI's personas and rules (like the Storytelling/Hikaya mode).
14. **Integrations:**
    - [`backend/src/integrations/gemini.py`](backend/src/integrations/gemini.py) (The LLM logic)
    - [`backend/src/integrations/speechmatics.py`](backend/src/integrations/speechmatics.py) (Speech-to-Text).

---

## 5. Database & Infrastructure 🗄️

If you need to understand how the database is structured or modified.

15. **Supabase Setup:** [`backend/src/database.py`](backend/src/database.py) — Connection pooling.
16. **Migrations:** [`backend/src/setup_auth_sync.py`](backend/src/setup_auth_sync.py) — The idempotent migration script that builds our SQL tables, RLS policies, and triggers linking Supabase `auth.users` to our `public.profiles`.
17. **Asset Sync:** [`backend/src/migrate_db_assets.py`](backend/src/migrate_db_assets.py) — Script to push static video/audio assets to Supabase Storage and link them to rows.

---

## 6. Utilities & Tools 🛠️

Once you understand the core system, explore our utility scripts in `backend/tools/`:
- `enrich_demo.py` / `enrich_othman.py` — How we embed and add new chunks to our RAG knowledgebase.
- `inspect_*.py` scripts — Read-only helpers to peek at foreign keys, user counts, and schemas without opening a DB console.
