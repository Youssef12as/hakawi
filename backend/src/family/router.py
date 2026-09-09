import json
import logging
import os
import uuid
from psycopg2.extras import Json
from fastapi import APIRouter, HTTPException, Request

from src.database import get_db_cursor
from src.family.constants import DEFAULT_TREE_ID
from src.family.utils import collect_tree_members, is_character_in_tree

logger = logging.getLogger(__name__)

router = APIRouter(tags=["family"])


@router.get("/api/family-tree")
async def get_family_tree():
    """Retrieve family tree directly from Supabase."""
    try:
        with get_db_cursor() as cur:
            cur.execute(
                "SELECT tree_data FROM public.family_trees WHERE id = %s;",
                (DEFAULT_TREE_ID,)
            )
            row = cur.fetchone()
            if row and row.get("tree_data"):
                return row["tree_data"]

            # Fallback if specific ID not found: get first tree in table
            cur.execute("SELECT tree_data FROM public.family_trees ORDER BY created_at ASC LIMIT 1;")
            row = cur.fetchone()
            if row and row.get("tree_data"):
                return row["tree_data"]

        raise HTTPException(status_code=404, detail="Family tree not found in database")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching family tree from Supabase: {e}")
        raise HTTPException(status_code=500, detail="Failed to load family tree from database")


def _sync_family_members(cur, tree_id: str, tree_data: dict):
    """Sync individual member records into public.family_members table."""
    cur.execute("SELECT key FROM public.voice_personas;")
    valid_persona_keys = {r["key"] for r in cur.fetchall()}

    all_members = collect_tree_members(tree_data)
    for m in all_members:
        member_id = m.get("id")
        if not member_id:
            continue

        raw_char = m.get("characterName") or m.get("name")
        persona_key = raw_char if raw_char in valid_persona_keys else None

        cur.execute(
            """
            INSERT INTO public.family_members (
                id, tree_id, name, role, avatar_url, is_me, is_add_node, status, voice_persona_key, memories_count
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                tree_id = EXCLUDED.tree_id,
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                avatar_url = EXCLUDED.avatar_url,
                is_me = EXCLUDED.is_me,
                is_add_node = EXCLUDED.is_add_node,
                status = EXCLUDED.status,
                voice_persona_key = EXCLUDED.voice_persona_key,
                memories_count = EXCLUDED.memories_count;
            """,
            (
                str(member_id),
                tree_id,
                m.get("name"),
                m.get("role", "قريب"),
                m.get("avatar"),
                m.get("isMe", False),
                m.get("isAddNode", False),
                m.get("status", "preserved"),
                persona_key,
                m.get("memories", 0),
            ),
        )


@router.post("/api/family-tree")
async def save_family_tree(request: Request):
    """Save updated family tree directly to Supabase."""
    try:
        from src.auth import get_optional_user_id
        user_id = get_optional_user_id(request)
        tree_data = await request.json()

        with get_db_cursor(commit=True) as cur:
            # 1. Update family_trees hierarchical structure
            cur.execute(
                """
                INSERT INTO public.family_trees (id, title, tree_data, user_id, updated_at)
                VALUES (%s, %s, %s, %s, timezone('utc'::text, now()))
                ON CONFLICT (id) DO UPDATE SET
                    tree_data = EXCLUDED.tree_data,
                    user_id = COALESCE(EXCLUDED.user_id, public.family_trees.user_id),
                    updated_at = timezone('utc'::text, now());
                """,
                (DEFAULT_TREE_ID, tree_data.get("title", "عائلتي"), Json(tree_data), user_id)
            )

            # 2. Sync individual member rows into public.family_members
            _sync_family_members(cur, DEFAULT_TREE_ID, tree_data)

        logger.info("Family tree and members successfully synced to Supabase.")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error saving family tree to Supabase: {e}")
        raise HTTPException(status_code=500, detail="Failed to save tree to database")
