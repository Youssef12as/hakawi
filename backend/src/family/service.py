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
