"""Read-only FK inspection for chat_sessions."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from src.database import get_db_cursor

with get_db_cursor() as cur:
    cur.execute("""
        SELECT conname, confrelid::regclass AS refs, confdeltype
        FROM pg_constraint
        WHERE conrelid = 'public.chat_sessions'::regclass AND contype = 'f';
    """)
    for r in cur.fetchall():
        print(f"{r['conname']:35} -> {r['refs']:25} on_delete={r['confdeltype']}")
