"""Guest chat persistence. Every query is scoped to an unexpired owner."""
from uuid import UUID, uuid4

from fastapi import HTTPException
from psycopg2.extras import Json

from src.database import get_db_cursor
from src.chat.service import SessionForbidden, SessionNotFound


def _uuid(value):
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(400, "Invalid session ID.")


def _summary(row):
    result = dict(row)
    result["id"] = str(result["id"])
    result.pop("guest_id", None)
    result["family_member_id"] = None
    for key in ("created_at", "updated_at"):
        result[key] = int(result[key].timestamp() * 1000)
    return result


class GuestChatStore:
    def __init__(self, guest_id):
        self.guest_id = str(guest_id)

    def _active(self, cur):
        # Lock the owner through writes so expiry cleanup cannot race an insert.
        cur.execute("SELECT id FROM public.guest_sessions WHERE id = %s AND expires_at > now() FOR UPDATE", (self.guest_id,))
        if not cur.fetchone():
            raise HTTPException(401, "Guest session expired.")

    def _session(self, cur, session_id):
        cur.execute("SELECT * FROM public.guest_chat_sessions WHERE id = %s AND guest_id = %s", (_uuid(session_id), self.guest_id))
        return cur.fetchone()

    def verify_session_ownership(self, session_id, user_id):
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            return self._session(cur, session_id) is not None

    def create_session(self, user_id, chat_mode="regional", governorate_key=None,
                       monument_key=None, family_member_id=None, language_mode="modern",
                       title=None, session_id=None):
        if chat_mode not in ("regional", "ancient") or family_member_id:
            raise HTTPException(403, "يجب تسجيل الدخول لاستخدام شجرة العائلة.")
        sid = _uuid(session_id) if session_id else str(uuid4())
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            cur.execute("SELECT count(*) AS count FROM public.guest_chat_sessions WHERE guest_id = %s", (self.guest_id,))
            if cur.fetchone()["count"] >= 100:
                raise HTTPException(429, "Guest conversation limit reached.")
            cur.execute("""INSERT INTO public.guest_chat_sessions
                (id, guest_id, chat_mode, governorate_key, monument_key, language_mode, title)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING""",
                (sid, self.guest_id, chat_mode, governorate_key, monument_key, language_mode, (title or "محادثة جديدة")[:80]))
            row = self._session(cur, sid)
            if row is None:
                raise SessionForbidden()
            return dict(row)

    def list_user_sessions(self, user_id, limit=100):
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            cur.execute("""SELECT s.*, (SELECT count(*) FROM public.guest_chat_messages m
                WHERE m.session_id = s.id) AS turn_count
                FROM public.guest_chat_sessions s WHERE s.guest_id = %s
                ORDER BY s.updated_at DESC LIMIT %s""", (self.guest_id, limit))
            return [_summary(row) for row in cur.fetchall()]

    def get_session_detail(self, session_id, user_id):
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            row = self._session(cur, session_id)
            if row is None:
                raise SessionNotFound()
        return {**_summary(row), "messages": self.get_session_messages(session_id)}

    def delete_session(self, session_id, user_id):
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            cur.execute("DELETE FROM public.guest_chat_sessions WHERE id = %s AND guest_id = %s", (_uuid(session_id), self.guest_id))
            return cur.rowcount > 0

    def _turns(self, session_id):
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            if not self._session(cur, session_id):
                raise SessionForbidden()
            cur.execute("SELECT * FROM public.guest_chat_messages WHERE session_id = %s ORDER BY created_at, id", (_uuid(session_id),))
            return cur.fetchall()

    def get_history(self, session_id):
        history = []
        for turn in self._turns(session_id):
            history.append({"role": "user", "parts": [{"text": turn["question"]}]})
            if turn["response"] is not None:
                history.append({"role": "model", "parts": [{"text": turn["response"]}]})
        return history

    def get_session_messages(self, session_id):
        messages = []
        for turn in self._turns(session_id):
            ts = int(turn["created_at"].timestamp() * 1000)
            messages.append({"id": str(turn["id"]), "sender": "user", "text": turn["question"], "timestamp": ts, "metadata": turn["metadata"]})
            if turn["response"] is not None:
                messages.append({"id": f"{turn['id']}-ai", "sender": "ai", "text": turn["response"], "timestamp": ts + 1, "metadata": turn["metadata"]})
        return messages

    def get_recent_session_history(self, user_id=None, monument_key=None, family_member_id=None, chat_mode=None):
        if family_member_id or chat_mode == "family_member":
            raise HTTPException(403, "Member login required.")
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            cur.execute("""SELECT id FROM public.guest_chat_sessions WHERE guest_id = %s
                AND (%s IS NULL OR monument_key = %s)
                AND (%s IS NULL OR chat_mode = %s)
                ORDER BY updated_at DESC LIMIT 1""", (self.guest_id, monument_key, monument_key, chat_mode, chat_mode))
            row = cur.fetchone()
        return (str(row["id"]), self.get_session_messages(row["id"])) if row else (None, [])

    def check_message_limit(self):
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            cur.execute("""UPDATE public.guest_sessions SET message_count = message_count + 1
                WHERE id = %s AND message_count < 200 RETURNING id""", (self.guest_id,))
            if not cur.fetchone():
                raise HTTPException(429, "Guest message limit reached. Please log in.")

    def save_chat_turn(self, session_id, user_id, question, response, chat_mode="regional",
                       governorate_key=None, monument_key=None, family_member_id=None,
                       language_mode="modern", metadata=None):
        if chat_mode not in ("regional", "ancient") or family_member_id:
            raise HTTPException(403, "Member login required.")
        with get_db_cursor(commit=True) as cur:
            self._active(cur)
            if not self._session(cur, session_id):
                raise SessionForbidden()
            cur.execute("""INSERT INTO public.guest_chat_messages (id, session_id, question, response, metadata)
                VALUES (%s, %s, %s, %s, %s)""", (str(uuid4()), _uuid(session_id), question, response, Json(metadata or {})))
            cur.execute("UPDATE public.guest_chat_sessions SET updated_at = now(), language_mode = %s WHERE id = %s AND guest_id = %s", (language_mode, _uuid(session_id), self.guest_id))
        return str(session_id)
