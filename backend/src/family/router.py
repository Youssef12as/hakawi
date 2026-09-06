import json
import logging
import os
import uuid

from fastapi import APIRouter, HTTPException, Request

from src.family.constants import DEFAULT_TREE_DATA
from src.family.service import is_character_in_tree

logger = logging.getLogger(__name__)

router = APIRouter(tags=["family"])


@router.get("/api/family-tree")
async def get_family_tree():
    """Retrieve family tree JSON, auto-merging newly registered characters."""
    tree_path = os.path.join("data", "characters", "family_tree.json")
    tree_data = DEFAULT_TREE_DATA.copy()

    if os.path.exists(tree_path):
        try:
            with open(tree_path, "r", encoding="utf-8") as f:
                tree_data = json.load(f)
        except Exception as e:
            logger.error(f"Error reading family_tree.json: {e}")

    # Auto-merge missing characters from registry
    registry_path = os.path.join("data", "characters", "registry.json")
    if os.path.exists(registry_path):
        try:
            with open(registry_path, "r", encoding="utf-8") as f:
                registry = json.load(f)
                has_changes = False
                for char_name in registry.keys():
                    if char_name in ["ana", "am-othman"]:
                        continue
                    if not is_character_in_tree(tree_data, char_name):
                        tree_data["members"].append({
                            "id": str(uuid.uuid4()),
                            "name": char_name,
                            "role": "فرد العائلة",
                            "characterName": char_name,
                            "status": "preserved",
                            "memories": 0,
                            "occasions": [],
                            "avatar": None,
                        })
                        has_changes = True
                if has_changes:
                    with open(tree_path, "w", encoding="utf-8") as out_f:
                        json.dump(tree_data, out_f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error auto-merging registry into tree: {e}")

    return tree_data


@router.post("/api/family-tree")
async def save_family_tree(request: Request):
    """Save updated family tree structure to JSON."""
    try:
        tree_data = await request.json()
        tree_path = os.path.join("data", "characters", "family_tree.json")
        with open(tree_path, "w", encoding="utf-8") as f:
            json.dump(tree_data, f, ensure_ascii=False, indent=2)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error saving family tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to save tree")
