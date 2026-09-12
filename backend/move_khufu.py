import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from src.database import get_db_cursor

with get_db_cursor(commit=True) as cur:
    cur.execute("UPDATE public.monuments SET governorate_key = 'cairo' WHERE key = 'khufu_pyramid';")
    cur.execute("DELETE FROM public.governorates WHERE key = 'giza';")
    print("Updated Khufu to be in Cairo governorate.")
