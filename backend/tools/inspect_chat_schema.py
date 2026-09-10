"""Read-only schema inspection for chat tables."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from src.database import get_db_cursor

with get_db_cursor() as cur:
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chat_sessions'
        ORDER BY ordinal_position;
    """)
    print("=== chat_sessions columns ===")
    for r in cur.fetchall():
        print(f"  {r['column_name']:22} {r['data_type']:20} nullable={r['is_nullable']}")

    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chat_messages'
        ORDER BY ordinal_position;
    """)
    print("=== chat_messages columns ===")
    for r in cur.fetchall():
        print(f"  {r['column_name']:22} {r['data_type']:20} nullable={r['is_nullable']}")

    cur.execute("""
        SELECT
            (SELECT count(*) FROM public.chat_sessions) AS sessions,
            (SELECT count(*) FROM public.chat_messages) AS messages,
            (SELECT count(*) FROM public.chat_sessions WHERE user_id IS NOT NULL) AS sessions_with_user;
    """)
    row = cur.fetchone()
    print(f"=== row counts === sessions={row['sessions']} messages={row['messages']} sessions_with_user={row['sessions_with_user']}")

    cur.execute("""
        SELECT tc.constraint_type, kcu.column_name, ccu.table_name AS references_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name IN ('chat_sessions','chat_messages') AND tc.constraint_type IN ('PRIMARY KEY','FOREIGN KEY')
        ORDER BY tc.table_name;
    """)
    print("=== constraints ===")
    for r in cur.fetchall():
        print(f"  {r['constraint_type']:15} {r['column_name']:20} -> {r['references_table']}")
