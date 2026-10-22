"""Explicit guest schema setup/verification and optional scheduled cleanup.

Run from backend: python tools/guest_database.py check|validate|migrate|cleanup
"""
import argparse
import sys
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.database import get_db_cursor
from src.config import settings


def validate_migration(sql):
    """Exercise PostgreSQL guest storage in a transaction that is rolled back."""
    from src.chat import guest_service
    from src.chat.service import SessionNotFound
    connection = psycopg2.connect(settings.DATABASE_URL, connect_timeout=10)
    original_cursor = guest_service.get_db_cursor

    @contextmanager
    def transaction_cursor(commit=False):
        with connection.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur

    try:
        with connection.cursor() as cur:
            cur.execute(sql.replace("BEGIN;", "").replace("COMMIT;", ""))
            ids = [str(uuid4()), str(uuid4())]
            for guest_id in ids:
                cur.execute("INSERT INTO public.guest_sessions (id, expires_at) VALUES (%s, %s)",
                            (guest_id, datetime.now(timezone.utc) + timedelta(hours=1)))
        guest_service.get_db_cursor = transaction_cursor
        first, second = [guest_service.GuestChatStore(gid) for gid in ids]
        sid = str(first.create_session(ids[0], chat_mode="ancient", monument_key="test")["id"])
        first.check_message_limit()
        first.save_chat_turn(sid, ids[0], "test question", "test response", chat_mode="ancient")
        assert len(first.get_session_detail(sid, ids[0])["messages"]) == 2
        assert first.list_user_sessions(ids[0])[0]["turn_count"] == 1
        assert first.get_recent_session_history(monument_key="test")[0] == sid
        assert not second.verify_session_ownership(sid, ids[1])
        try:
            second.get_session_detail(sid, ids[1])
        except SessionNotFound:
            pass
        else:
            raise AssertionError("Guest isolation failed")
        assert first.delete_session(sid, ids[0])
        print("PostgreSQL migration, chat persistence, history, and isolation validated; rolled back.")
    finally:
        guest_service.get_db_cursor = original_cursor
        connection.rollback()
        connection.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["check", "validate", "migrate", "cleanup"])
    action = parser.parse_args().action
    if action in ("validate", "migrate"):
        migration = Path(__file__).resolve().parents[1] / "migrations/001_guest_chat.sql"
        if action == "validate":
            validate_migration(migration.read_text(encoding="utf-8"))
            return
        with get_db_cursor(commit=True) as cur:
            cur.execute(migration.read_text(encoding="utf-8"))
        print("Guest tables created; member tables unchanged.")
    elif action == "cleanup":
        from src.guest_auth import cleanup_expired_guests
        cleanup_expired_guests()
        print("Expired guest data removed.")
    else:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""SELECT to_regclass('public.guest_sessions') AS guests,
                to_regclass('public.guest_chat_sessions') AS sessions,
                to_regclass('public.guest_chat_messages') AS messages""")
            row = cur.fetchone()
        if not all(row.values()):
            raise SystemExit("Guest schema is not installed.")
        print("All guest tables exist.")


if __name__ == "__main__":
    main()
