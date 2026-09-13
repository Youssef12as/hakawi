import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from src.database import get_db_cursor

with get_db_cursor() as cur:
    cur.execute("SELECT * FROM public.governorates WHERE key IN ('cairo', 'giza');")
    govs = cur.fetchall()
    for g in govs:
        print(g['key'], g['lat'], g['lng'])
