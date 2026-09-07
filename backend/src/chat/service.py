import json
import logging
import re
from collections import OrderedDict
from psycopg2.extras import Json

from src.database import get_db_cursor

import uuid

logger = logging.getLogger(__name__)


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


# In-memory store kept for offline/reference
MAX_SESSIONS = 256
conversation_history: "OrderedDict[str, list[dict]]" = OrderedDict()


def get_history(session_id: str) -> list[dict]:
    """
    Get conversation history for Gemini directly from Supabase chat_messages.
    Returns list of dicts with role and parts.
    """
    if not session_id:
        return []
    try:
        safe_session_id = _ensure_valid_uuid(session_id)
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT role, content
                FROM public.chat_messages
                WHERE session_id = %s
                ORDER BY created_at ASC;
                """,
                (safe_session_id,)
            )
            rows = cur.fetchall()

        history = []
        for r in rows:
            gemini_role = "user" if r["role"] == "user" else "model"
            history.append({
                "role": gemini_role,
                "parts": [{"text": r["content"]}]
            })
        return history

    except Exception as e:
        logger.error(f"Error loading chat history from Supabase for session {session_id}: {e}")
        return []


def get_session_messages(session_id: str) -> list[dict]:
    """
    Get formatted message history for frontend display.
    Returns list of dicts: [{'id': ..., 'sender': 'user'|'ai', 'text': ..., 'timestamp': ...}]
    """
    if not session_id:
        return []
    try:
        safe_session_id = _ensure_valid_uuid(session_id)
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT id, role, content, created_at, metadata
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
            sender = "user" if r["role"] == "user" else "ai"
            messages.append({
                "id": str(r["id"]),
                "sender": sender,
                "text": r["content"],
                "timestamp": ts,
                "metadata": r.get("metadata") or {},
            })
        return messages
    except Exception as e:
        logger.error(f"Error fetching session messages for {session_id}: {e}")
        return []


def get_recent_session_history(
    monument_key: str | None = None,
    family_member_id: str | None = None,
    chat_mode: str | None = None,
) -> tuple[str | None, list[dict]]:
    """
    Find the most recent active session for a monument or family member and return its messages.
    """
    try:
        with get_db_cursor() as cur:
            if family_member_id:
                actual_member_id = _resolve_family_member_id(cur, family_member_id) or family_member_id
                cur.execute(
                    """
                    SELECT id FROM public.chat_sessions
                    WHERE family_member_id = %s
                    ORDER BY updated_at DESC LIMIT 1;
                    """,
                    (actual_member_id,)
                )
            elif monument_key:
                cur.execute(
                    """
                    SELECT id FROM public.chat_sessions
                    WHERE monument_key = %s
                    ORDER BY updated_at DESC LIMIT 1;
                    """,
                    (monument_key,)
                )
            elif chat_mode:
                cur.execute(
                    """
                    SELECT id FROM public.chat_sessions
                    WHERE chat_mode = %s
                    ORDER BY updated_at DESC LIMIT 1;
                    """,
                    (chat_mode,)
                )
            else:
                return None, []

            row = cur.fetchone()
            if not row:
                return None, []

            session_id = str(row["id"])

        messages = get_session_messages(session_id)
        return session_id, messages
    except Exception as e:
        logger.error(f"Error finding recent session: {e}")
        return None, []


def save_chat_turn(
    session_id: str,
    user_text: str,
    assistant_text: str,
    chat_mode: str = "regional",
    governorate_key: str | None = None,
    monument_key: str | None = None,
    family_member_id: str | None = None,
    language_mode: str = "modern",
    metadata: dict | None = None,
) -> None:
    """
    Persist a user/assistant turn into public.chat_sessions and public.chat_messages.
    """
    try:
        safe_session_id = _ensure_valid_uuid(session_id)
        with get_db_cursor(commit=True) as cur:
            # Resolve family member ID against database foreign key
            resolved_member_id = None
            if chat_mode == "family_member" and family_member_id:
                resolved_member_id = _resolve_family_member_id(cur, family_member_id)
                if not resolved_member_id:
                    logger.warning(
                        f"Could not resolve family_member_id for '{family_member_id}'. Saving session without FK."
                    )

            # 1. Ensure chat session exists
            cur.execute(
                """
                INSERT INTO public.chat_sessions (
                    id, chat_mode, governorate_key, monument_key, family_member_id, language_mode, title
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    updated_at = timezone('utc'::text, now()),
                    family_member_id = COALESCE(EXCLUDED.family_member_id, chat_sessions.family_member_id),
                    monument_key = COALESCE(EXCLUDED.monument_key, chat_sessions.monument_key),
                    governorate_key = COALESCE(EXCLUDED.governorate_key, chat_sessions.governorate_key);
                """,
                (
                    safe_session_id,
                    chat_mode,
                    governorate_key,
                    monument_key,
                    resolved_member_id,
                    language_mode,
                    user_text[:80],
                )
            )

            # 2. Insert User Message
            cur.execute(
                """
                INSERT INTO public.chat_messages (session_id, role, content)
                VALUES (%s, 'user', %s);
                """,
                (safe_session_id, user_text)
            )

            # 3. Insert Assistant Message
            cur.execute(
                """
                INSERT INTO public.chat_messages (session_id, role, content, metadata)
                VALUES (%s, 'assistant', %s, %s);
                """,
                (safe_session_id, assistant_text, Json(metadata or {}))
            )

    except Exception as e:
        logger.error(f"Error saving chat turn to Supabase: {e}")


