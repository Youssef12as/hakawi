import os
import shutil
import requests
import psycopg2
from dotenv import load_dotenv

# Load backend/.env
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hueymfgudrgdlmyaxeoi.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
VOICE_API_URL = os.environ.get("VOICE_API_URL")

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_AUDIO = os.path.join(ROOT_DIR, "khufo.mp3")

REF_TEXT = "متنساش بردو يا فندم ان اي توتر في باب المندب أو مضيق هرمز بيعلي تكلفة الشحن و بيخوف المستثمر الاجنبي فا بيسحب فلوسه فورا"

print("1. Checking audio file...")
if not os.path.exists(SRC_AUDIO):
    raise FileNotFoundError(f"Audio file not found at: {SRC_AUDIO}")

print(f"Source audio path: {SRC_AUDIO}")
with open(SRC_AUDIO, "rb") as f:
    audio_data = f.read()
print(f"Audio size: {len(audio_data)} bytes")

# 2. Save locally into backend/data/characters
char_dir = os.path.join(os.path.dirname(__file__), "data", "characters")
os.makedirs(char_dir, exist_ok=True)
local_khufu_en = os.path.join(char_dir, "khufu.mp3")
local_khufo_en = os.path.join(char_dir, "khufo.mp3")
local_khufu_ar = os.path.join(char_dir, "خوفو.mp3")

for p in [local_khufu_en, local_khufo_en, local_khufu_ar]:
    with open(p, "wb") as f:
        f.write(audio_data)
print(f"Saved locally to {char_dir}")

# 3. Upload to Supabase Storage
headers = {
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "audio/mpeg",
    "x-upsert": "true",
}

for storage_key in ["audios/khufu.mp3", "audios/khufo.mp3"]:
    upload_url = f"{SUPABASE_URL}/storage/v1/object/characters/{storage_key}"
    try:
        res = requests.post(upload_url, headers=headers, data=audio_data, timeout=15)
        print(f"Uploaded {storage_key} -> Status: {res.status_code}")
    except Exception as e:
        print(f"Upload error for {storage_key}: {e}")

public_audio_url = f"{SUPABASE_URL}/storage/v1/object/public/characters/audios/khufu.mp3"
print(f"Public storage URL: {public_audio_url}")

# 4. Update Database
print("Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

keys_to_update = [
    ("الهرم الأكبر — خوفو", "خوفو"),
    ("khufu", "خوفو"),
    ("khufo", "خوفو"),
    ("خوفو", "خوفو"),
    ("khufu_pyramid", "خوفو"),
]

for key, name in keys_to_update:
    cur.execute("""
        INSERT INTO public.voice_personas (key, name, ref_audio_path, ref_text, is_custom)
        VALUES (%s, %s, %s, %s, false)
        ON CONFLICT (key) DO UPDATE SET
            name = EXCLUDED.name,
            ref_audio_path = EXCLUDED.ref_audio_path,
            ref_text = EXCLUDED.ref_text,
            is_custom = false;
    """, (key, name, public_audio_url, REF_TEXT))
    print(f"Updated voice_personas row for key: {key}")

# Update monuments
cur.execute("""
    UPDATE public.monuments
    SET ancient_voice_key = 'الهرم الأكبر — خوفو',
        modern_voice_key = 'الهرم الأكبر — خوفو'
    WHERE key = 'khufu_pyramid';
""")
print("Updated monuments row for khufu_pyramid")

# Verify
cur.execute("SELECT key, name, ref_audio_path, ref_text FROM public.voice_personas WHERE key IN ('الهرم الأكبر — خوفو', 'khufu', 'khufo', 'خوفو', 'khufu_pyramid');")
print("\n=== VERIFICATION IN DATABASE ===")
for r in cur.fetchall():
    print(f"Key: {r[0]} | Name: {r[1]} | Audio: {r[2]} | Text: {r[3][:40]}...")

cur.close()
conn.close()

# 5. Optional: Test Lightning TTS connectivity
if VOICE_API_URL:
    try:
        import base64
        audio_b64 = base64.b64encode(audio_data).decode("utf-8")
        save_payload = {
            "action": "save_character",
            "char_name": "الهرم الأكبر — خوفو",
            "audio_prompt": audio_b64,
            "ref_text": REF_TEXT,
        }
        api_url = VOICE_API_URL.rstrip("/") + "/"
        print(f"\nSending save_character to Lightning TTS ({api_url})...")
        t_res = requests.post(api_url, json=save_payload, timeout=5)
        print(f"Lightning TTS response: {t_res.status_code} {t_res.text[:200]}")
    except Exception as e:
        print(f"Lightning TTS API check notice: {e}")
