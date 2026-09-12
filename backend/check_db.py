import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from src.database import get_db_cursor

with get_db_cursor() as cur:
    cur.execute("SELECT key FROM public.governorates;")
    govs = [g['key'] for g in cur.fetchall()]
    print("Gov keys:", govs)
    
    cur.execute("SELECT key, governorate_key FROM public.monuments WHERE governorate_key = 'cairo';")
    cairo_mons = [m['key'] for m in cur.fetchall()]
    print("Cairo mons:", len(cairo_mons), cairo_mons)
    
    cur.execute("SELECT key, governorate_key FROM public.monuments WHERE governorate_key = 'giza';")
    giza_mons = [m['key'] for m in cur.fetchall()]
    print("Giza mons:", len(giza_mons), giza_mons)
