"""Offline regressions for Khufu's ordinary retrieval/generation path."""

import json
from pathlib import Path

import numpy as np
import pytest

from src.chat import rag_service
from src.chat.historical_prompts import HISTORICAL_PERSONAS
from tools.enrich_khufu import merge_chunks

DATA = Path(__file__).resolve().parents[1] / "data" / "rag"
MONUMENT = "الهرم الأكبر — خوفو"
CURATED = json.loads((DATA / "khufu_chunks.json").read_text(encoding="utf-8"))


def test_curated_knowledge_is_indexed_without_truncating_sources_or_images():
    chunks = {c["id"]: c for c in json.loads((DATA / "chunks.json").read_text(encoding="utf-8"))}
    indexed = {c["id"]: c for c in json.loads((DATA / "embeddings.json").read_text(encoding="utf-8"))}
    for chunk in CURATED:
        assert chunks[chunk["id"]] == chunk
        stored = indexed[chunk["id"]]
        assert {k: v for k, v in stored.items() if k != "embedding"} == chunk
        assert len(stored["embedding"]) == 3072
        assert np.isfinite(stored["embedding"]).all()
        assert np.linalg.norm(stored["embedding"]) > 0
        context = rag_service.build_context([(1.0, stored)])
        assert chunk["text"] in context
        if chunk.get("image_markdown"):
            assert chunk["image_markdown"] in context
            assert chunk["image_credit"] in context


def test_enrichment_preserves_other_monuments_and_is_idempotent():
    other = {"id": "ramses", "text": "Existing Ramses knowledge", "embedding": [0.5]}
    old = {"id": CURATED[0]["id"], "text": "Outdated construction claim"}
    result = merge_chunks([other, old], CURATED)
    assert result[0] is other
    assert result[1] == CURATED[0]
    assert merge_chunks(result, CURATED) == result


@pytest.mark.parametrize("mode", ["direct", "hikaya", "presentation"])
def test_retrieval_keeps_khufu_persona_and_grounding_in_every_mode(monkeypatch, mode):
    rag_service._ensure_loaded()
    target = next(c for c in rag_service._chunks if c["id"] == "giza_khufu_05")
    vector = np.asarray(target["embedding"], dtype=np.float32)
    monkeypatch.setattr(rag_service, "_embed_query", lambda question: vector / np.linalg.norm(vector))
    payload = rag_service.retrieve_and_build(
        "هل الفراغ غرفة كنز؟", monument_name=MONUMENT, response_mode=mode
    )
    assert payload["chunks"][0][1]["id"] == "giza_khufu_05"
    assert all(c["monument"].strip("# ") == MONUMENT for _, c in payload["chunks"])
    assert payload["persona_key"] == MONUMENT
    assert target["text"] in payload["user_prompt"]
    assert HISTORICAL_PERSONAS[MONUMENT]["guidance"] in payload["system_prompt"]
    assert "هل الفراغ غرفة كنز؟" in payload["user_prompt"]
