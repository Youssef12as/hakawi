"""Update Khufu reference chunks and their embeddings without touching other data.

Run from the repository root: backend/venv/Scripts/python.exe backend/tools/enrich_khufu.py
Run again after a full prepare_data2.py rebuild to restore the curated additions.
Replies still use the normal retrieval and Gemini generation pipeline.
"""

import json
from pathlib import Path
import sys

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
DATA = BACKEND / "data" / "rag"


def merge_chunks(existing, replacements):
    """Replace matching IDs in place and append new IDs, preserving other rows."""
    updates = {chunk["id"]: chunk for chunk in replacements}
    merged = [updates.pop(chunk["id"], chunk) for chunk in existing]
    return merged + list(updates.values())


def main():
    from google import genai
    from src.config import settings

    curated = json.loads((DATA / "khufu_chunks.json").read_text(encoding="utf-8"))
    chunks_path = DATA / "chunks.json"
    embeddings_path = DATA / "embeddings.json"
    chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
    embeddings = json.loads(embeddings_path.read_text(encoding="utf-8"))
    indexed = {row["id"]: row for row in embeddings}
    dimension = len(embeddings[0]["embedding"])
    replacements = []
    client = None
    for chunk in curated:
        # build_context currently passes at most 800 characters per chunk.
        if len(chunk["text"]) > 800:
            raise ValueError(f"{chunk['id']} exceeds the runtime context limit")
        old = indexed.get(chunk["id"])
        if old and old["text"] == chunk["text"]:
            vector = old["embedding"]
        else:
            if client is None:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
            result = client.models.embed_content(
                model="gemini-embedding-001", contents=chunk["text"]
            )
            vector = result.embeddings[0].values
        if len(vector) != dimension:
            raise ValueError("Embedding dimension differs from the existing index")
        replacements.append({**chunk, "embedding": vector})

    # Do not write either output until every API call has succeeded.
    for path, rows in (
        (chunks_path, merge_chunks(chunks, curated)),
        (embeddings_path, merge_chunks(embeddings, replacements)),
    ):
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(path)
    print(f"Updated {len(curated)} Khufu chunks; other monuments preserved.")


if __name__ == "__main__":
    main()
