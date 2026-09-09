"""
Migration script to synchronize auth.users and public.profiles,
set up RLS policies, storage bucket policies, and deletion/update triggers.
"""

import psycopg2
from src.database import DATABASE_URL

def run_migration():
    print(f"Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("1. Creating policies for public.profiles...")
    cur.execute("""
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

    CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

    CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

    CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

    CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);
    """)

    print("2. Ensuring storage bucket 'avatars' exists and is public...")
    try:
        cur.execute("""
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
        ON CONFLICT (id) DO UPDATE SET public = true;
        """)
        print("   Avatars bucket verified.")
    except Exception as e:
        print(f"   Bucket check note: {e}")

    print("3. Updating handle_new_user and handle_update_user triggers on auth.users...")
    cur.execute("""
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        INSERT INTO public.profiles (id, display_name, avatar_url, updated_at)
        VALUES (
            NEW.id,
            COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name',
                split_part(NEW.email, '@', 1)
            ),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            display_name = COALESCE(
                EXCLUDED.display_name,
                public.profiles.display_name
            ),
            avatar_url = CASE 
                WHEN EXCLUDED.avatar_url IS NOT NULL AND EXCLUDED.avatar_url <> '' 
                THEN EXCLUDED.avatar_url 
                ELSE public.profiles.avatar_url 
            END,
            updated_at = NOW();
        RETURN NEW;
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.handle_update_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        INSERT INTO public.profiles (id, display_name, avatar_url, updated_at)
        VALUES (
            NEW.id,
            COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name',
                split_part(NEW.email, '@', 1)
            ),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            display_name = COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name',
                public.profiles.display_name
            ),
            avatar_url = CASE 
                WHEN NEW.raw_user_meta_data->>'avatar_url' IS NOT NULL AND NEW.raw_user_meta_data->>'avatar_url' <> ''
                THEN NEW.raw_user_meta_data->>'avatar_url'
                ELSE public.profiles.avatar_url
            END,
            updated_at = NOW();
        RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();

    DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
    CREATE TRIGGER on_auth_user_updated
      AFTER UPDATE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_update_user();
    """)

    print("4. Creating trigger on public.profiles to delete auth.users if profile is deleted...")
    cur.execute("""
    CREATE OR REPLACE FUNCTION public.handle_deleted_profile()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.id) THEN
            DELETE FROM auth.users WHERE id = OLD.id;
        END IF;
        RETURN OLD;
    END;
    $$;

    DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
    CREATE TRIGGER on_profile_deleted
      AFTER DELETE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_deleted_profile();
    """)

    print("5. Syncing any existing auth.users into public.profiles...")
    cur.execute("""
    INSERT INTO public.profiles (id, display_name, avatar_url, updated_at)
    SELECT 
        u.id,
        COALESCE(
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'name',
            split_part(u.email, '@', 1)
        ),
        COALESCE(u.raw_user_meta_data->>'avatar_url', ''),
        NOW()
    FROM auth.users u
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = CASE 
            WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url 
            ELSE public.profiles.avatar_url 
        END,
        updated_at = NOW();
    """)

    print("Migration completed successfully!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    run_migration()
