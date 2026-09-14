import json
import logging
import os
import uuid
from psycopg2.extras import Json
from fastapi import APIRouter, HTTPException, Request, Depends

from src.database import get_db_cursor
from src.auth import get_current_user_id
from src.family.constants import DEFAULT_TREE_ID
from src.family.utils import collect_tree_members, is_character_in_tree, prune_tree_members

logger = logging.getLogger(__name__)

router = APIRouter(tags=["family"])


@router.get("/api/family-tree")
async def get_family_tree(user_id: str = Depends(get_current_user_id)):
    """Retrieve family tree directly from Supabase, synchronizing with public.family_members."""
    try:
        with get_db_cursor(commit=True) as cur:
            # Check if user has a tree
            cur.execute(
                "SELECT id, tree_data FROM public.family_trees WHERE user_id = %s LIMIT 1;",
                (user_id,)
            )
            row = cur.fetchone()
            
            if row and row.get("tree_data"):
                # User has a tree, return it
                tree_id = str(row["id"])
                tree_data = row["tree_data"]
                
                # Prune any members that were deleted directly from public.family_members
                cur.execute("SELECT id FROM public.family_members WHERE tree_id = %s;", (tree_id,))
                valid_ids = {str(r["id"]) for r in cur.fetchall()}
                
                if valid_ids and prune_tree_members(tree_data, valid_ids):
                    cur.execute(
                        "UPDATE public.family_trees SET tree_data = %s WHERE id = %s;",
                        (Json(tree_data), tree_id)
                    )
                
                return tree_data
            
            # First time user: Clone the default tree
            cur.execute(
                "SELECT id, tree_data FROM public.family_trees WHERE id = %s;",
                (DEFAULT_TREE_ID,)
            )
            default_row = cur.fetchone()
            if not default_row or not default_row.get("tree_data"):
                raise HTTPException(status_code=404, detail="Default family tree not found in database to clone.")
                
            default_tree_data = default_row["tree_data"]
            new_tree_id = str(uuid.uuid4())
            
            # Recursive function to regenerate UUIDs for all members
            def regenerate_ids(node):
                if "members" in node:
                    for member in node["members"]:
                        member["id"] = str(uuid.uuid4())
                if "children" in node:
                    for child in node["children"]:
                        regenerate_ids(child)
                return node
                
            new_tree_data = regenerate_ids(json.loads(json.dumps(default_tree_data))) # Deep copy and regenerate
            
            # Insert the new tree for this user
            cur.execute(
                """
                INSERT INTO public.family_trees (id, title, tree_data, user_id, updated_at)
                VALUES (%s, %s, %s, %s, timezone('utc'::text, now()))
                """,
                (new_tree_id, new_tree_data.get("title", "عائلتي"), Json(new_tree_data), user_id)
            )
            
            # Sync the members to public.family_members
            _sync_family_members(cur, new_tree_id, new_tree_data)
            
            return new_tree_data

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
async def save_family_tree(request: Request, user_id: str = Depends(get_current_user_id)):
    """Save updated family tree directly to Supabase."""
    try:
        tree_data = await request.json()

        with get_db_cursor(commit=True) as cur:
            # Find user's tree_id
            cur.execute("SELECT id FROM public.family_trees WHERE user_id = %s LIMIT 1;", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User family tree not found to update.")
            
            tree_id = str(row["id"])

            # 1. Update family_trees hierarchical structure and title
            new_title = tree_data.get("title", "عائلتي")
            cur.execute(
                """
                UPDATE public.family_trees 
                SET title = %s, tree_data = %s, updated_at = timezone('utc'::text, now())
                WHERE id = %s AND user_id = %s;
                """,
                (new_title, Json(tree_data), tree_id, user_id)
            )

            # 2. Sync individual member rows into public.family_members
            _sync_family_members(cur, tree_id, tree_data)

        logger.info("Family tree and members successfully synced to Supabase.")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving family tree to Supabase: {e}")
        raise HTTPException(status_code=500, detail="Failed to save tree to database")
