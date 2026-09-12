import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from src.database import get_db_cursor

with get_db_cursor() as cur:
    cur.execute("SELECT key FROM public.governorates;")
    govs = cur.fetchall()
    print("Governorates keys:", [g['key'] for g in govs])
    
    cur.execute("SELECT key, governorate_key FROM public.monuments WHERE monument_name LIKE '%زوسر%';")
    zoser = cur.fetchall()
    print("Zoser gov key:", [z['governorate_key'] for z in zoser])
