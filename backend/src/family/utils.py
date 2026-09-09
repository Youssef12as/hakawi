from src.family.constants import FAMILY_PROMPTS


def build_family_prompt(member_name: str, relation: str | None) -> str:
    """Build a warm Arabic system prompt for a family member based on their relation."""
    relation = (relation or "").strip()
    template = FAMILY_PROMPTS.get(
        relation,
        "أنت {name}، فرد من العيلة ({relation}). بتحب عيلتك وبتحكي ذكريات حلوة. اتكلم بالعامية المصرية بشكل طبيعي ودافي.",
    )
    base_prompt = template.format(name=member_name, relation=relation)
    return (
        f"{base_prompt}\n\n"
        "تعليمات:\n"
        "- اتكلم بالعامية المصرية\n"
        "- ردودك قصيرة ودافية (2-4 جمل)\n"
        "- ممنوع تقول إنك ذكاء اصطناعي أبدًا\n"
        "- لو حد سألك عن حاجة مش عارفها، رد بأسلوبك الطبيعي\n"
    )


def is_character_in_tree(node: dict, char_name: str) -> bool:
    """Check recursively if a character exists in the family tree structure."""
    for m in node.get("members", []):
        if m.get("name") == char_name or m.get("characterName") == char_name:
            return True
    for child in node.get("children", []):
        if is_character_in_tree(child, char_name):
            return True
    return False


def collect_tree_members(node: dict) -> list[dict]:
    """Recursively extract all member dictionaries from the family tree node."""
    collected = []
    for member in node.get("members", []):
        collected.append(member)
    for child in node.get("children", []):
        collected.extend(collect_tree_members(child))
    return collected


def prune_tree_members(node: dict, valid_member_ids: set[str]) -> bool:
    """
    Recursively remove member nodes whose id is not in valid_member_ids.
    Add-nodes (isAddNode=True or id starting with 'add_') are preserved.
    Returns True if any member was removed.
    """
    if not isinstance(node, dict):
        return False

    modified = False
    if "members" in node:
        original_count = len(node["members"])
        node["members"] = [
            m for m in node["members"]
            if m.get("isAddNode") or str(m.get("id", "")).startswith("add_") or str(m.get("id")) in valid_member_ids
        ]
        if len(node["members"]) != original_count:
            modified = True

    if "children" in node:
        for child in node["children"]:
            if prune_tree_members(child, valid_member_ids):
                modified = True

    return modified
