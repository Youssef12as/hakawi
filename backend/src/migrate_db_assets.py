"""
Database Migration & Character Assets Upload to Supabase Storage.
1. Clean up unused columns from public.profiles.
2. Ensure columns exist on public.monuments and public.voice_personas.
3. Ensure storage bucket 'characters' exists and is public.
4. Upload character videos, audios, and images to Supabase Storage.
5. Populate URLs into database rows.
"""

import os
import mimetypes
import psycopg2
import requests
from src.database import DATABASE_URL

SUPABASE_URL = "https://hueymfgudrgdlmyaxeoi.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZXltZmd1ZHJnZGxteWF4ZW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MjIwMjksImV4cCI6MjEwNDI5ODAyOX0.FqNgaSlyzsPjtBc2o5qrPWs4L40p83iK0VCJc5Yr5vE"
BUCKET_NAME = "characters"


def run_migration():
    print("Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # 1. Clean up profiles table
    print("1. Dropping preferred_governorate and preferred_dialect from public.profiles...")
    cur.execute("""
        ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_governorate;
        ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_dialect;
    """)
    print("   Profiles columns cleaned up.")

    # 2. Ensure asset columns on public.monuments and public.voice_personas
    print("2. Adding asset URL columns to public.monuments and public.voice_personas...")
    cur.execute("""
        ALTER TABLE public.monuments 
            ADD COLUMN IF NOT EXISTS idle_video_url TEXT,
            ADD COLUMN IF NOT EXISTS talking_video_url TEXT,
            ADD COLUMN IF NOT EXISTS avatar_url TEXT;

        ALTER TABLE public.voice_personas 
            ADD COLUMN IF NOT EXISTS idle_video_url TEXT,
            ADD COLUMN IF NOT EXISTS talking_video_url TEXT,
            ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    """)
    print("   Columns added or verified.")

    # 3. Create characters storage bucket and RLS policies
    print("3. Ensuring 'characters' storage bucket and policies...")
    cur.execute("""
        INSERT INTO storage.buckets (id, name, public, file_size_limit)
        VALUES ('characters', 'characters', true, 52428800)
        ON CONFLICT (id) DO UPDATE SET public = true;

        DROP POLICY IF EXISTS "Public character assets viewable by everyone" ON storage.objects;
        CREATE POLICY "Public character assets viewable by everyone"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'characters');

        DROP POLICY IF EXISTS "Allow upload to characters bucket" ON storage.objects;
        CREATE POLICY "Allow upload to characters bucket"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'characters');

        DROP POLICY IF EXISTS "Allow update to characters bucket" ON storage.objects;
        CREATE POLICY "Allow update to characters bucket"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'characters');
    """)
    print("   Bucket and policies verified.")

    # Helper function to upload file to Supabase storage
    def upload_file(local_path: str, storage_key: str) -> str:
        mime_type, _ = mimetypes.guess_type(local_path)
        if not mime_type:
            if local_path.endswith(".mp4"):
                mime_type = "video/mp4"
            elif local_path.endswith(".mp3"):
                mime_type = "audio/mpeg"
            elif local_path.endswith(".wav"):
                mime_type = "audio/wav"
            elif local_path.endswith(".png"):
                mime_type = "image/png"
            else:
                mime_type = "application/octet-stream"

        with open(local_path, "rb") as f:
            data = f.read()

        upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_key}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": mime_type,
            "x-upsert": "true",
        }
        res = requests.post(upload_url, headers=headers, data=data)
        if res.status_code not in (200, 201):
            print(f"   [WARN] Upload failed for {storage_key}: {res.status_code} {res.text}")
        else:
            print(f"   [OK] Uploaded {storage_key} ({len(data)} bytes)")

        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_key}"

    # 4. Upload videos
    print("4. Uploading character videos...")
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
    char_video_dir = os.path.join(frontend_dir, "public", "character")
    video_urls = {}
    if os.path.exists(char_video_dir):
        for fname in os.listdir(char_video_dir):
            if fname.endswith(".mp4"):
                path = os.path.join(char_video_dir, fname)
                video_urls[fname] = upload_file(path, f"videos/{fname}")

    # 5. Upload audios
    print("5. Uploading character voice audios...")
    backend_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "characters"))
    audio_urls = {}
    if os.path.exists(backend_data_dir):
        for fname in os.listdir(backend_data_dir):
            if fname.endswith((".mp3", ".wav")):
                path = os.path.join(backend_data_dir, fname)
                safe_key = fname.replace(" ", "_")
                audio_urls[fname] = upload_file(path, f"audios/{safe_key}")

    # 6. Upload character portraits
    print("6. Uploading character images...")
    assets_dir = os.path.join(frontend_dir, "public", "assets")
    image_urls = {}
    if os.path.exists(assets_dir):
        for fname in os.listdir(assets_dir):
            if fname.startswith("char-") and fname.endswith(".png"):
                path = os.path.join(assets_dir, fname)
                image_urls[fname] = upload_file(path, f"images/{fname}")

    # 7. Update database rows
    print("7. Updating database records with Supabase Storage asset URLs...")
    othman_idle = video_urls.get("am-othman-idle.mp4", f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/videos/am-othman-idle.mp4")
    othman_talking = video_urls.get("am-othman-talking.mp4", f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/videos/am-othman-talking.mp4")
    ramsis_idle = video_urls.get("ramsis_idle.mp4", f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/videos/ramsis_idle.mp4")
    ramsis_talking = video_urls.get("ramsis_talking.mp4", f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/videos/ramsis_talking.mp4")

    # Update voice_personas
    cur.execute("""
        UPDATE public.voice_personas
        SET idle_video_url = %s, talking_video_url = %s
        WHERE key IN ('am-othman', 'am-mohamed', 'amr-abdeen-modern');

        UPDATE public.voice_personas
        SET idle_video_url = %s, talking_video_url = %s
        WHERE key IN ('ramsis', 'amr-abdeen');
    """, (othman_idle, othman_talking, ramsis_idle, ramsis_talking))

    # Update voice_personas ref_audio_path if we uploaded
    if "am-othman.wav.mp3" in audio_urls:
        cur.execute("UPDATE public.voice_personas SET ref_audio_path = %s WHERE key = 'am-othman';", (audio_urls["am-othman.wav.mp3"],))
    if "Ancient.wav.mp3" in audio_urls:
        cur.execute("UPDATE public.voice_personas SET ref_audio_path = %s WHERE key IN ('ramsis', 'amr-abdeen');", (audio_urls["Ancient.wav.mp3"],))
    if "amr-abdeen-modern.mp3" in audio_urls:
        cur.execute("UPDATE public.voice_personas SET ref_audio_path = %s WHERE key = 'amr-abdeen-modern';", (audio_urls["amr-abdeen-modern.mp3"],))
    if "aswan.wav.mp3" in audio_urls:
        cur.execute("UPDATE public.voice_personas SET ref_audio_path = %s WHERE key = 'am-mohamed';", (audio_urls["aswan.wav.mp3"],))

    # Update monuments
    # Ramses / Abu-Simbel
    cur.execute("""
        UPDATE public.monuments
        SET idle_video_url = %s, talking_video_url = %s
        WHERE key = 'abu-simbel' OR ancient_voice_key = 'ramsis';
    """, (ramsis_idle, ramsis_talking))

    # All other monuments default to Am Othman video (or regional character)
    cur.execute("""
        UPDATE public.monuments
        SET idle_video_url = %s, talking_video_url = %s
        WHERE idle_video_url IS NULL;
    """, (othman_idle, othman_talking))

    print("Migration and asset upload completed successfully!")
    cur.close()
    conn.close()


if __name__ == "__main__":
    run_migration()
