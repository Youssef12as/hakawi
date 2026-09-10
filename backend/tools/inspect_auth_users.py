"""Read-only inspection: auth.users required columns + existing user count."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from src.database import get_db_cursor

with get_db_cursor() as cur:
    cur.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'users'
          AND is_nullable = 'NO' AND column_default IS NULL
        ORDER BY ordinal_position;
    """)
    print("=== auth.users required (NOT NULL, no default) ===")
    for r in cur.fetchall():
        print(f"  {r['column_name']}: {r['data_type']}")

    cur.execute("SELECT count(*) AS n FROM auth.users;")
    print("existing users:", cur.fetchone()["n"])
