import re
from collections import OrderedDict


def clean_text_formatting(text: str) -> str:
    """Clean markdown asterisks and duplicated punctuation from LLM response."""
    if not text:
        return text
    text = text.replace("**", "").replace("*", "")
    text = re.sub(r"([،,])\1+", r"\1", text)
    return text.strip()


# ─── In-Memory Conversation Store (with simple LRU cap) ──────────────────────
MAX_SESSIONS = 256
conversation_history: "OrderedDict[str, list[dict]]" = OrderedDict()


def get_history(session_id: str) -> list[dict]:
    """Get (or create) the conversation history for a session, marking it MRU."""
    if session_id not in conversation_history:
        conversation_history[session_id] = []
        while len(conversation_history) > MAX_SESSIONS:
            conversation_history.popitem(last=False)
    else:
        conversation_history.move_to_end(session_id)
    return conversation_history[session_id]
