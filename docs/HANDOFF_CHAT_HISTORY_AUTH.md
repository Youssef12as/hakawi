# HANDOFF — Chat History + Auth Integration (`feat/chat-history-auth`)

> **Status: Backend + core frontend COMPLETE and verified (26/26 tests passing).**
> Remaining work: environment secrets, E2E browser verification, optional page polish.

---

## 1. Goal (original requirements)

1. **Refactor `chat_messages`**: question + response stored in **one row** (was 2 rows with `role`/`content`). Response can be NULL; a response can never exist without its question.
2. **Chat history feature**: ChatGPT/Gemini-style — sidebar of past sessions, open one, read transcript, **continue chatting** in it.
3. **Auth integration**: when the user starts a session, the frontend sends the Supabase **access token**, the backend **verifies** it, extracts `user_id`, and creates the session owned by that user.
4. **Isolation**: users can only access **their own** chat history (foreign sessions → 404, no existence leak).
5. **No guests**: all chat endpoints require authentication. Sign-up required.

## 2. Architecture delivered

### Database (migration applied & verified)

- **`chat_sessions`**: existing `user_id` column now used → `REFERENCES auth.users(id) ON DELETE CASCADE` (deleting an account deletes their sessions/turns). Index `(user_id, updated_at DESC)`.
- **`chat_messages`** (rebuilt, old garbage data dropped):
  ```sql
  id UUID PK, session_id UUID NOT NULL → chat_sessions ON DELETE CASCADE,
  question TEXT NOT NULL, response TEXT NULL, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ
  -- question NOT NULL enforces "no response without question"
  ```
- Migration lives in **`backend/src/setup_auth_sync.py`** (the project's single migrations file), step 6. Idempotent; re-runnable.

### Auth flow

- Frontend: `frontend/src/utils/apiAuth.js` → `getAuthHeaders()` fetches the fresh access token via `supabase.auth.getSession()` (auto-refreshed) and sets `Authorization: Bearer <token>`. `handleUnauthorized()` signs out + redirects to `/login` on 401.
- Backend: `backend/src/auth.py` → `get_current_user_id` (FastAPI dependency): verifies **HS256 signature** against `SUPABASE_JWT_SECRET`, `aud="authenticated"`, `exp`, requires `sub` → raises **401** on any failure. `get_optional_user_id` (old unverified variant) kept for `/api/characters/add` and `/api/family-tree`.

### Endpoints

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api/chat/sessions` | Required | Create owned session (accepts `chat_mode`, `monument_key`, `governorate_key`, `family_member_id`, `language_mode`, `title`, optional client `session_id`) |
| `GET /api/chat/sessions` | Required | List user's sessions (title, mode, counts, timestamps) |
| `GET /api/chat/sessions/{id}` | Required | Session + transcript — owner only (else 404) |
| `DELETE /api/chat/sessions/{id}` | Required | Owner-only delete (turns cascade) |
| `POST /api/chat/text` / `audio` / `ancient` | **Required (new)** | Ownership-checked `session_id`; no session → lazily creates owned one. Turn metadata now stores `character_name`, `tts_text`, `member_name`, `relation` |
| `GET /api/chat/history` | Required | User-scoped; `session_id` ownership enforced; monument/member/mode lookups return **the user's** most recent session |
| `/api/governorates`, `/api/tts`, `/api/stt`, `/api/registry` | Public (unchanged) |

### Chat history UI

- New page `frontend/src/pages/ChatHistory.jsx` at route **`/history`** (protected) + Navbar link "محادثاتي".
- ChatGPT-style: sidebar (sessions with mode badges, dates, turn counts, per-item delete) + main transcript pane + `ChatInput` to **continue the same session**. Continue-chat routes to the correct endpoint using the session's stored context (ancient → `sendAncientMessage` with monument/language mode; regional → `sendTextMessage(region)`; family → resolves member name/relation from turn metadata). Old AI messages have a TTS replay button.
- `MapInteract.jsx` now calls `createSession()` (token → owned session) instead of client-side `uuidv4()`.

## 3. Files changed

**Backend (modified):** `src/auth.py` (verified dependency), `src/config.py` (`SUPABASE_JWT_SECRET`), `src/chat/service.py` (full rewrite: single-row turns, `create_session`, `list_user_sessions`, `get_session_detail`, `delete_session`, `verify_session_ownership`, `SessionNotFound`/`SessionForbidden`), `src/chat/router.py` (session CRUD + auth on chat endpoints), `src/chat/schemas.py` (session DTOs), `src/chat/metrics.py` (fixed pre-existing missing-`logger` bug), `src/setup_auth_sync.py` (step 6 migration), `requirements/base.txt` (+`psycopg2-binary`, `PyJWT` — previously working by accident).

**Backend (new):** `tests/conftest.py`, `tests/test_auth.py`, `tests/test_chat_sessions.py`, `tools/inspect_chat_schema.py`, `tools/inspect_chat_fks.py`, `tools/inspect_auth_users.py` (read-only DB inspection).

**Frontend (modified):** `src/hooks/useChatApi.js` (auth headers everywhere + `createSession`/`fetchSessions`/`fetchSessionDetail`/`deleteSession` + 401 handling), `src/App.jsx` (route), `src/components/layout/Navbar.jsx` (link), `src/pages/MapInteract.jsx`.

**Frontend (new):** `src/utils/apiAuth.js`, `src/pages/ChatHistory.jsx`.

**Docs:** `backend/BACKEND.md` updated (schema, endpoints table, env vars, test instructions).

## 4. Verification already done

- Migration applied to Supabase and schema verified via `backend/tools/inspect_chat_schema.py` (columns, FK cascade, 11 legacy garbage sessions purged).
- **`python -m pytest tests` → 26 passed** (run from `backend/`):
  - `test_auth.py`: 401 for missing token on every chat endpoint; 401 for expired / wrong-signature / wrong-audience / garbage / no-`sub` tokens; public endpoints stay public.
  - `test_chat_sessions.py`: create stamps `user_id`; list/detail/delete scoped to owner; foreign session → 404 (detail, delete, writing into it, history); single-row turn persistence; follow-up reuses session; ancient metadata (`character_name`, `tts_text`) persisted; history user-scoped; schema rejects NULL `question`.
  - Tests create throwaway `auth.users` rows and clean up via the profiles-deletion trigger (verified: 0 leftovers).
- Frontend production build passes (`npm run build`).

## 5. REMAINING STEPS for the next agent

### Step 1 — CRITICAL: environment secrets (blocks real usage)

1. **`backend/.env`**: set `SUPABASE_JWT_SECRET=<real secret>` (Supabase Dashboard → Project Settings → API → JWT Secret). A placeholder key already exists in the file.
2. **`frontend/.env`** (does NOT exist yet — auth cannot work locally without it):
   ```env
   VITE_SUPABASE_URL=https://hueymfgudrgdlmyaxeoi.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
3. **Contingency**: if the project uses Supabase's new **asymmetric signing keys**, HS256 verification will fail (every request 401 with "Invalid authentication token"). Fix: switch `get_current_user_id` in `backend/src/auth.py` to JWKS/RS256 verification (`jwt.PyJWKClient` with `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`). Quick check: try logging in and chatting; if 401s appear with a valid token, this is the cause.

### Step 2 — E2E browser verification (checklist)

```bash
# backend
cd backend && uvicorn src.main:app --reload --port 8000
# frontend
cd frontend && npm run dev
```
- [ ] Guest (logged out) hitting any chat page → redirected to `/login` (ProtectedRoute) and API returns 401.
- [ ] Sign up / log in → open `/map` → pick governorate → pick monument → chat (text + voice).
- [ ] Verify session appears in `/history` ("محادثاتي" in navbar) with monument name + mode badge.
- [ ] Open the session in `/history` → transcript renders → **send a message → conversation continues in the same session** (check it reappears in the map page history for that monument).
- [ ] TTS replay button works on old AI messages (uses `metadata.tts_text` + `metadata.character_name`).
- [ ] Delete a session from the sidebar → disappears and `GET /api/chat/sessions/{id}` → 404.
- [ ] With a second account: confirm user B's history never shows user A's sessions.
- [ ] Old sessions from before deployment are gone (expected — garbage purge by design).

### Step 3 — Optional polish (lazy creation already covers these)

- `FamilyTree.jsx`, `AncientMode.jsx`, `LivingWall.jsx`: optionally call `createSession({...})` when starting a chat (pattern in `MapInteract.jsx:handleSelectMonument`). Currently the backend lazily creates owned sessions on the first message, which already satisfies the ownership requirements.
- `FamilyTree.jsx:handleSelectMember` already restores history via `fetchChatHistory({familyMemberId})` — now correctly user-scoped; verify in browser.

### Known non-goals / notes

- Family trees remain **global** (`DEFAULT_TREE_ID`), not per-user (out of scope).
- `/api/tts` and `/api/stt` are intentionally public (asset/STT utilities).
- Root `package-lock.json` (untracked) is a stray artifact — do not commit.
- `backend/tools/*` are read-only DB inspection helpers; safe to keep.
- Test suite runs against the **real Supabase DB** using throwaway users cleaned up by the profiles trigger — never run it against a database with data you can't afford to lose (chat tables are wiped only for the test users, but be aware).
