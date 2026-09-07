import os
import sys
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from src.seed_fixtures import (
    DEFAULT_TREE_DATA,
    GOVERNORATES,
    HISTORICAL_PERSONAS,
    MONUMENTS,
    VOICES,
)

# Load .env
load_dotenv(os.path.join(backend_dir, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in backend/.env!")
    print("👉 Please add: DATABASE_URL=postgresql://... to your backend/.env file.")
    sys.exit(1)


def seed():
    print("🔌 Connecting to Supabase...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # 1. Governorates
        print("📍 1/4 Seeding Governorates...")
        for gov in GOVERNORATES:
            cur.execute(
                """
                INSERT INTO public.governorates (key, name_ar, name_en, lat, lng)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (key) DO UPDATE SET
                    name_ar = EXCLUDED.name_ar,
                    name_en = EXCLUDED.name_en,
                    lat = EXCLUDED.lat,
                    lng = EXCLUDED.lng;
                """,
                (gov["key"], gov["name"], gov["name_en"], gov["lat"], gov["lng"])
            )
        print(f"   ✓ Seeded {len(GOVERNORATES)} governorates.")

        # 2. Voice Personas
        print("🎙️ 2/4 Seeding Voice Personas (personas.py)...")
        for key, v in VOICES.items():
            cur.execute(
                """
                INSERT INTO public.voice_personas (key, name, ref_audio_path, ref_text, is_custom, is_cloned)
                VALUES (%s, %s, %s, %s, false, true)
                ON CONFLICT (key) DO UPDATE SET
                    name = EXCLUDED.name,
                    ref_audio_path = EXCLUDED.ref_audio_path,
                    ref_text = EXCLUDED.ref_text,
                    is_custom = false,
                    is_cloned = true;
                """,
                (key, v["name"], v["ref_audio_path"], v["ref_text"])
            )
        print(f"   ✓ Seeded {len(VOICES)} voice personas.")

        # 3. Historical Prompts
        print("📜 3/4 Seeding Historical Prompts (prompts.py)...")
        prompt_id_map = {}
        for mon_name, p in HISTORICAL_PERSONAS.items():
            cur.execute(
                """
                INSERT INTO public.historical_prompts (
                    monument_name, tone, language, vocabulary, on_unknown, example, avoid
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (monument_name) DO UPDATE SET
                    tone = EXCLUDED.tone,
                    language = EXCLUDED.language,
                    vocabulary = EXCLUDED.vocabulary,
                    on_unknown = EXCLUDED.on_unknown,
                    example = EXCLUDED.example,
                    avoid = EXCLUDED.avoid
                RETURNING id, monument_name;
                """,
                (
                    mon_name,
                    p["tone"],
                    p["language"],
                    p["vocabulary"],
                    p["on_unknown"],
                    p["example"],
                    p["avoid"],
                )
            )
            row = cur.fetchone()
            prompt_id_map[row[1]] = row[0]
        print(f"   ✓ Seeded {len(HISTORICAL_PERSONAS)} historical persona prompts.")

        # 4. Monuments
        print("🏛️ 4/4 Seeding Monuments (registry.py)...")
        for mon in MONUMENTS:
            mon_name = mon["monument_name"]
            prompt_id = prompt_id_map.get(mon_name)

            # Determine dual voices (modern vs ancient)
            char_key = mon.get("character_name", "am-othman")
            if char_key == "ramsis":
                modern_voice = "amr-abdeen-modern"
                ancient_voice = "ramsis"
            else:
                modern_voice = char_key if char_key in VOICES else "am-othman"
                ancient_voice = "am-othman"

            cur.execute(
                """
                INSERT INTO public.monuments (
                    key, governorate_key, modern_voice_key, ancient_voice_key, prompt_id,
                    monument_name, display_name, builder, title, bio,
                    lat, lng, chips
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (key) DO UPDATE SET
                    governorate_key = EXCLUDED.governorate_key,
                    modern_voice_key = EXCLUDED.modern_voice_key,
                    ancient_voice_key = EXCLUDED.ancient_voice_key,
                    prompt_id = EXCLUDED.prompt_id,
                    monument_name = EXCLUDED.monument_name,
                    display_name = EXCLUDED.display_name,
                    builder = EXCLUDED.builder,
                    title = EXCLUDED.title,
                    bio = EXCLUDED.bio,
                    lat = EXCLUDED.lat,
                    lng = EXCLUDED.lng,
                    chips = EXCLUDED.chips;
                """,
                (
                    mon["key"],
                    mon["governorate"],
                    modern_voice,
                    ancient_voice,
                    prompt_id,
                    mon_name,
                    mon["display_name"],
                    mon["builder"],
                    mon.get("title"),
                    mon.get("bio"),
                    mon["lat"],
                    mon["lng"],
                    Json(mon.get("chips", [])),
                )
            )
        print(f"   ✓ Seeded {len(MONUMENTS)} monuments.")

        # 5. Family Oral Archive
        print("🌳 5/5 Seeding Default Family Oral Archive (family/constants.py)...")
        DEFAULT_TREE_ID = "00000000-0000-0000-0000-000000000001"

        # 5a. Insert/Update Root Family Tree
        cur.execute(
            """
            INSERT INTO public.family_trees (id, user_id, title, tree_data)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                tree_data = EXCLUDED.tree_data,
                updated_at = timezone('utc'::text, now());
            """,
            (DEFAULT_TREE_ID, None, "عائلة حكواتي", Json(DEFAULT_TREE_DATA)),
        )

        # 5b. Extract and insert all members recursively
        def collect_members(node):
            collected = []
            for member in node.get("members", []):
                collected.append(member)
            for child in node.get("children", []):
                collected.extend(collect_members(child))
            return collected

        all_members = collect_members(DEFAULT_TREE_DATA)
        for m in all_members:
            cur.execute(
                """
                INSERT INTO public.family_members (
                    id, tree_id, name, role, avatar_url, is_me, is_add_node, status, memories_count
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    tree_id = EXCLUDED.tree_id,
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    avatar_url = EXCLUDED.avatar_url,
                    is_me = EXCLUDED.is_me,
                    is_add_node = EXCLUDED.is_add_node,
                    status = EXCLUDED.status,
                    memories_count = EXCLUDED.memories_count;
                """,
                (
                    m["id"],
                    DEFAULT_TREE_ID,
                    m.get("name"),
                    m["role"],
                    m.get("avatar"),
                    m.get("isMe", False),
                    m.get("isAddNode", False),
                    m.get("status", "preserved"),
                    m.get("memories", 0),
                ),
            )

            # Insert occasions if present
            for occ_str in m.get("occasions", []):
                parts = [p.strip() for p in occ_str.split("—", 1)]
                title = parts[0]
                date_str = parts[1] if len(parts) > 1 else ""
                cur.execute(
                    """
                    INSERT INTO public.family_occasions (member_id, title, occasion_date)
                    VALUES (%s, %s, %s);
                    """,
                    (m["id"], title, date_str),
                )

        # 5c. Insert default kinship relationships
        default_relations = [
            ("gf", "f", "parent_of"),
            ("gm", "f", "parent_of"),
            ("f", "me", "parent_of"),
            ("m", "me", "parent_of"),
        ]
        for parent_id, child_id, rel_type in default_relations:
            cur.execute(
                """
                INSERT INTO public.family_relationships (tree_id, parent_member_id, child_member_id, relation_type)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (tree_id, parent_member_id, child_member_id) DO NOTHING;
                """,
                (DEFAULT_TREE_ID, parent_id, child_id, rel_type),
            )

        print(f"   ✓ Seeded default family tree with {len(all_members)} nodes and relationships.")

        conn.commit()
        print("\n🎉 SUCCESS! All tables populated in Supabase.")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error seeding data: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed()
