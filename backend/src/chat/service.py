import logging
import re
import uuid

from psycopg2.extras import Json

from src.database import get_db_cursor

logger = logging.getLogger(__name__)


class SessionNotFound(Exception):
    """Raised when a session does not exist."""


class SessionForbidden(Exception):
    """Raised when a user tries to access a session they do not own."""


def _ensure_valid_uuid(val: str | None) -> str:
    """Ensure a string is a valid UUID, or derive a stable one."""
    if not val:
        return str(uuid.uuid4())
    try:
        return str(uuid.UUID(val))
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, val))


def _resolve_family_member_id(cur, raw_id_or_name: str | None) -> str | None:
    """Resolve raw id or name to valid family_members(id) to satisfy foreign key."""
    if not raw_id_or_name:
        return None
    try:
        cur.execute(
            "SELECT id FROM public.family_members WHERE id = %s OR name = %s LIMIT 1;",
            (raw_id_or_name, raw_id_or_name),
        )
        row = cur.fetchone()
        return row["id"] if row else None
    except Exception as e:
        logger.error(f"Error resolving family member ID for '{raw_id_or_name}': {e}")
        return None


def clean_text_formatting(text: str) -> str:
    """Clean markdown asterisks and duplicated punctuation from LLM response."""
    if not text:
        return text
    text = text.replace("**", "").replace("*", "")
    text = re.sub(r"([،,])\1+", r"\1", text)
    return text.strip()


# ─── Session management ────────────────────────────────────────────────────


def verify_session_ownership(session_id: str, user_id: str) -> bool:
    """
    Pre-flight ownership check used before loading conversation history.
    Returns True when the session does not exist yet (it will be lazily
    created owned by this user) or when it belongs to the user.
    Returns False only when the session exists and belongs to someone else.
    """
    safe_session_id = _ensure_valid_uuid(session_id)
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT user_id FROM public.chat_sessions WHERE id = %s;",
            (safe_session_id,),
        )
        row = cur.fetchone()
    if row is None:
        return True
    return row["user_id"] is None or row["user_id"] == user_id


def create_session(
    user_id: str,
    chat_mode: str = "regional",
    governorate_key: str | None = None,
    monument_key: str | None = None,
    family_member_id: str | None = None,
    language_mode: str = "modern",
    title: str | None = None,
    session_id: str | None = None,
) -> dict:
    """Create a chat session owned by the given user. Returns the session row."""
    safe_session_id = _ensure_valid_uuid(session_id)
    try:
        with get_db_cursor(commit=True) as cur:
            # Reject collision with an existing session (ownership safety)
            cur.execute(
                "SELECT id, user_id FROM public.chat_sessions WHERE id = %s;",
                (safe_session_id,),
            )
            existing = cur.fetchone()
            if existing:
                if existing["user_id"] and existing["user_id"] != user_id:
                    raise SessionForbidden()
                # Same owner re-creating: return existing session
                return dict(existing)

            resolved_member_id = None
            if family_member_id:
                resolved_member_id = _resolve_family_member_id(cur, family_member_id)

            cur.execute(
                """
                INSERT INTO public.chat_sessions (
                    id, user_id, chat_mode, governorate_key, monument_key,
                    family_member_id, language_mode, title
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, user_id, chat_mode, governorate_key, monument_key,
                          family_member_id, language_mode, title, created_at, updated_at;
                """,
                (
                    safe_session_id,
                    user_id,
                    chat_mode,
                    governorate_key,
                    monument_key,
                    resolved_member_id,
                    language_mode,
                    (title or "محادثة جديدة")[:80],
                ),
            )
            row = cur.fetchone()
            return dict(row)
    except SessionForbidden:
        raise
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise


def list_user_sessions(user_id: str, limit: int = 100) -> list[dict]:
    """List all chat sessions owned by the user, newest first."""
    try:
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.chat_mode, s.governorate_key, s.monument_key,
                       s.family_member_id, s.language_mode, s.title,
                       s.created_at, s.updated_at,
                       (SELECT count(*) FROM public.chat_messages m
                        WHERE m.session_id = s.id) AS turn_count
                FROM public.chat_sessions s
                WHERE s.user_id = %s
                ORDER BY s.updated_at DESC
                LIMIT %s;
                """,
                (user_id, limit),
            )
            rows = cur.fetchall()

        sessions = []
        for r in rows:
            sessions.append({
                "id": str(r["id"]),
                "chat_mode": r["chat_mode"],
                "governorate_key": r["governorate_key"],
                "monument_key": r["monument_key"],
                "family_member_id": r["family_member_id"],
                "language_mode": r["language_mode"] or "modern",
                "title": r["title"] or "محادثة جديدة",
                "created_at": int(r["created_at"].timestamp() * 1000) if r.get("created_at") else 0,
                "updated_at": int(r["updated_at"].timestamp() * 1000) if r.get("updated_at") else 0,
                "turn_count": r["turn_count"],
            })
        return sessions
    except Exception as e:
        logger.error(f"Error listing user sessions: {e}")
        return []


def get_session_detail(session_id: str, user_id: str) -> dict:
    """
    Get a session with its messages, enforcing ownership.
    Raises SessionNotFound / SessionForbidden.
    """
    safe_session_id = _ensure_valid_uuid(session_id)
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, chat_mode, governorate_key, monument_key,
                   family_member_id, language_mode, title, created_at, updated_at
            FROM public.chat_sessions
            WHERE id = %s;
            """,
            (safe_session_id,),
        )
        session = cur.fetchone()
        if not session:
            raise SessionNotFound()
        if session["user_id"] != user_id:
            raise SessionForbidden()

    messages = get_session_messages(safe_session_id)
    return {
        "id": str(session["id"]),
        "chat_mode": session["chat_mode"],
        "governorate_key": session["governorate_key"],
        "monument_key": session["monument_key"],
        "family_member_id": session["family_member_id"],
        "language_mode": session["language_mode"] or "modern",
        "title": session["title"] or "محادثة جديدة",
        "created_at": int(session["created_at"].timestamp() * 1000) if session.get("created_at") else 0,
        "updated_at": int(session["updated_at"].timestamp() * 1000) if session.get("updated_at") else 0,
        "messages": messages,
    }


def delete_session(session_id: str, user_id: str) -> bool:
    """Delete a session owned by the user. Returns True on success."""
    safe_session_id = _ensure_valid_uuid(session_id)
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute(
                "DELETE FROM public.chat_sessions WHERE id = %s AND user_id = %s;",
                (safe_session_id, user_id),
            )
            return cur.rowcount > 0
    except Exception as e:
        logger.error(f"Error deleting session {session_id}: {e}")
        return False


def _ensure_owned_session(
    cur,
    session_id: str,
    user_id: str,
    chat_mode: str,
    governorate_key: str | None,
    monument_key: str | None,
    family_member_id: str | None,
    language_mode: str,
    title: str | None,
) -> str:
    """
    Get an existing session ID after verifying ownership, or lazily create
    a new session owned by user_id. Raises SessionForbidden if the session
    belongs to a different user.
    """
    safe_session_id = _ensure_valid_uuid(session_id)

    cur.execute(
        "SELECT id, user_id FROM public.chat_sessions WHERE id = %s;",
        (safe_session_id,),
    )
    existing = cur.fetchone()

    if existing:
        if existing["user_id"] and existing["user_id"] != user_id:
            raise SessionForbidden()
        if existing["user_id"] is None:
            # Claim orphaned (ownerless) session for this user
            cur.execute(
                "UPDATE public.chat_sessions SET user_id = %s WHERE id = %s;",
                (user_id, str(existing["id"])),
            )
        # Keep language_mode fresh (user may have toggled modern/ancient)
        cur.execute(
            "UPDATE public.chat_sessions SET language_mode = %s WHERE id = %s AND language_mode IS DISTINCT FROM %s;",
            (language_mode, str(existing["id"]), language_mode),
        )
        return str(existing["id"])

    # Session does not exist yet — lazily create it owned by this user
    resolved_member_id = None
    if family_member_id:
        resolved_member_id = _resolve_family_member_id(cur, family_member_id)

    cur.execute(
        """
        INSERT INTO public.chat_sessions (
            id, user_id, chat_mode, governorate_key, monument_key,
            family_member_id, language_mode, title
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING;
        """,
        (
            safe_session_id,
            user_id,
            chat_mode,
            governorate_key,
            monument_key,
            resolved_member_id,
            language_mode,
            (title or "محادثة جديدة")[:80],
        ),
    )
    return safe_session_id


# ─── Message history ───────────────────────────────────────────────────────


def get_history(session_id: str) -> list[dict]:
    """
    Get conversation history for Gemini from chat_messages turns.
    Each turn maps to a user part (question) and a model part (response).
    """
    if not session_id:
        return []
    try:
        safe_session_id = _ensure_valid_uuid(session_id)
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT question, response
                FROM public.chat_messages
                WHERE session_id = %s
                ORDER BY created_at ASC;
                """,
                (safe_session_id,)
            )
            rows = cur.fetchall()

        history = []
        for r in rows:
            history.append({"role": "user", "parts": [{"text": r["question"]}]})
            if r["response"] is not None:
                history.append({"role": "model", "parts": [{"text": r["response"]}]})
        return history

    except Exception as e:
        logger.error(f"Error loading chat history for session {session_id}: {e}")
        return []


def get_session_messages(session_id: str) -> list[dict]:
    """
    Get formatted messages for frontend display.
    Each turn expands into a user message and (when answered) an ai message.
    Returns list of dicts: [{'id': ..., 'sender': 'user'|'ai', 'text': ..., 'timestamp': ..., 'metadata': ...}]
    """
    if not session_id:
        return []
    try:
        safe_session_id = _ensure_valid_uuid(session_id)
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT id, question, response, created_at, metadata
                FROM public.chat_messages
                WHERE session_id = %s
                ORDER BY created_at ASC;
                """,
                (safe_session_id,)
            )
            rows = cur.fetchall()

        messages = []
        for r in rows:
            ts = int(r["created_at"].timestamp() * 1000) if r.get("created_at") else 0
            metadata = r.get("metadata") or {}
            messages.append({
                "id": str(r["id"]),
                "sender": "user",
                "text": r["question"],
                "timestamp": ts,
                "metadata": metadata,
            })
            if r["response"] is not None:
                messages.append({
                    "id": f"{r['id']}-ai",
                    "sender": "ai",
                    "text": r["response"],
                    "timestamp": ts + 1,
                    "metadata": metadata,
                })
        return messages
    except Exception as e:
        logger.error(f"Error fetching session messages for {session_id}: {e}")
        return []


def get_recent_session_history(
    user_id: str | None = None,
    monument_key: str | None = None,
    family_member_id: str | None = None,
    chat_mode: str | None = None,
) -> tuple[str | None, list[dict]]:
    """
    Find the user's most recent session matching the given filters and
    return (session_id, messages). Always scoped to the user.
    """
    try:
        with get_db_cursor() as cur:
            conditions = ["user_id = %s"]
            params: list = [user_id]

            if family_member_id:
                actual_member_id = _resolve_family_member_id(cur, family_member_id) or family_member_id
                conditions.append("family_member_id = %s")
                params.append(actual_member_id)
            elif monument_key:
                conditions.append("monument_key = %s")
                params.append(monument_key)
            elif chat_mode:
                conditions.append("chat_mode = %s")
                params.append(chat_mode)

            cur.execute(
                f"""
                SELECT id FROM public.chat_sessions
                WHERE {' AND '.join(conditions)}
                ORDER BY updated_at DESC LIMIT 1;
                """,
                tuple(params),
            )
            row = cur.fetchone()
            if not row:
                return None, []

            session_id = str(row["id"])

        messages = get_session_messages(session_id)
        return session_id, messages
    except Exception as e:
        logger.error(f"Error finding recent session: {e}")
        return None, []


# ─── Turn persistence ──────────────────────────────────────────────────────


def save_chat_turn(
    session_id: str,
    user_id: str,
    question: str,
    response: str,
    chat_mode: str = "regional",
    governorate_key: str | None = None,
    monument_key: str | None = None,
    family_member_id: str | None = None,
    language_mode: str = "modern",
    metadata: dict | None = None,
) -> str:
    """
    Persist a full question+response turn as a single row in
    public.chat_messages, upserting the owned session first.

    Returns the session id. Ownership is enforced: raises SessionForbidden
    when the session belongs to a different user.
    """
    safe_session_id = _ensure_valid_uuid(session_id)
    with get_db_cursor(commit=True) as cur:
        safe_session_id = _ensure_owned_session(
            cur,
            session_id=safe_session_id,
            user_id=user_id,
            chat_mode=chat_mode,
            governorate_key=governorate_key,
            monument_key=monument_key,
            family_member_id=family_member_id,
            language_mode=language_mode,
            title=question,
        )

        # 1. Insert the turn: question + response in one row
        cur.execute(
            """
            INSERT INTO public.chat_messages (session_id, question, response, metadata)
            VALUES (%s, %s, %s, %s);
            """,
            (safe_session_id, question, response, Json(metadata or {}))
        )

        # 2. Bump session activity
        cur.execute(
            """
            UPDATE public.chat_sessions
            SET updated_at = timezone('utc'::text, now())
            WHERE id = %s;
            """,
            (safe_session_id,)
        )

    return safe_session_id
