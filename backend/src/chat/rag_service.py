"""
Retrieval-Augmented Generation (RAG) service for Hikawi.

This module is the bridge between the precomputed embedding index
(`backend/data/rag/embeddings.json`, produced by `index_data.py`) and the
FastAPI backend.  It loads the index once at import time, exposes a
cosine-similarity `search()` function, and provides a small wrapper around
the Gemini embedding endpoint for query-time encoding.

Design notes:
- The full index (~424 chunks, ~18 MB on disk) is loaded into memory once
  and reused for every request.  This is deliberate: for a hackathon-scale
  dataset, in-memory linear scan with numpy is faster and simpler than
  spinning up a vector DB.
- Embeddings are stored as plain Python lists in JSON; we convert them to
  a single `(N, D)` numpy matrix on load so `search()` can be a single
  vectorized matmul instead of a Python loop.
"""

import json
import logging
import os
from typing import Any

import numpy as np
from google import genai

from src.config import settings
from src.chat.utils import (
    format_persona_instructions,
    get_historical_persona,
)

logger = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_SRC_ROOT = os.path.dirname(_HERE)
_BACKEND_ROOT = os.path.dirname(_SRC_ROOT)
_DATA_DIR = os.path.join(_BACKEND_ROOT, "data", "rag")
EMBEDDINGS_FILE = os.path.join(_DATA_DIR, "embeddings.json")

EMBEDDING_MODEL = "gemini-embedding-001"
DEFAULT_TOP_K = 4

# ─── Lazy singleton state ─────────────────────────────────────────────────
# Populated by `_ensure_loaded()`.  We use a lazy loader instead of import
# time so the FastAPI app can still start (e.g. for `/health`) even if the
# embeddings file is missing — only RAG-dependent endpoints will fail.
_chunks: list[dict] = []
_matrix: np.ndarray | None = None  # shape (N, D), float32
_client: genai.Client | None = None
# Map monument_name → array of row indices into _chunks/_matrix.
# Built once on load so monument-filtered search is O(filtered) not O(N).
_monument_indices: dict[str, np.ndarray] = {}


def _client_get() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _ensure_loaded() -> None:
    """Load embeddings.json into memory on first use."""
    global _chunks, _matrix, _monument_indices
    if _matrix is not None:
        return

    if not os.path.exists(EMBEDDINGS_FILE):
        raise RuntimeError(
            f"RAG index not found at {EMBEDDINGS_FILE}. "
            f"Run `python index_data.py` from the repo root to build it."
        )

    with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
        _chunks = json.load(f)

    if not _chunks:
        raise RuntimeError("RAG index is empty — rebuild it with index_data.py")

    _matrix = np.asarray(
        [c["embedding"] for c in _chunks], dtype=np.float32
    )
    # Pre-compute norms for cosine similarity
    norms = np.linalg.norm(_matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    _matrix = _matrix / norms  # store normalized rows → cosine = dot product

    # Build monument → indices lookup for filtered search
    temp: dict[str, list[int]] = {}
    for i, c in enumerate(_chunks):
        name = c.get("monument", "").replace("#", "").strip()
        temp.setdefault(name, []).append(i)
    _monument_indices = {k: np.asarray(v, dtype=np.int64) for k, v in temp.items()}

    logger.info(
        "RAG index loaded: %d chunks, dim=%d, %d unique monuments",
        len(_chunks),
        _matrix.shape[1],
        len(_monument_indices),
    )


def is_ready() -> bool:
    """True if the RAG index can be loaded (without raising)."""
    try:
        _ensure_loaded()
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("RAG not ready: %s", e)
        return False


def _embed_query(query: str) -> np.ndarray:
    """Embed a user query via Gemini and return an L2-normalized vector."""
    response = _client_get().models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
    )
    vec = np.asarray(response.embeddings[0].values, dtype=np.float32)
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


try:
    from opentelemetry import trace
    rag_tracer = trace.get_tracer("hikawi.rag")
except ImportError:
    rag_tracer = None


def search(
    query: str,
    top_k: int = DEFAULT_TOP_K,
    monument_name: str | None = None,
) -> list[tuple[float, dict]]:
    """Wrapped search function with OpenTelemetry tracing (if available)."""
    if not rag_tracer:
        return _search_internal(query, top_k, monument_name)

    with rag_tracer.start_as_current_span("RAG.search") as span:
        span.set_attribute("rag.query", query)
        span.set_attribute("rag.top_k", top_k)
        if monument_name:
            span.set_attribute("rag.monument", monument_name)
        
        results = _search_internal(query, top_k, monument_name)
        
        span.set_attribute("rag.retrieved_chunks_count", len(results))
        # Log the retrieved texts for full observability
        for i, (score, chunk) in enumerate(results):
            span.set_attribute(f"rag.chunk.{i}.score", score)
            span.set_attribute(f"rag.chunk.{i}.text", chunk.get("text", "")[:200] + "...")
            
        return results

def _search_internal(
    query: str,
    top_k: int = DEFAULT_TOP_K,
    monument_name: str | None = None,
) -> list[tuple[float, dict]]:
    """
    Return the `top_k` most relevant chunks for `query`.

    Each returned item is a `(score, chunk_dict)` tuple, sorted by score
    descending.  Score is cosine similarity in [-1, 1].

    If `monument_name` is given (exact match to chunk["monument"]), the
    search is constrained to chunks belonging to that monument only.  This
    is used when the user explicitly picks a monument from the map — we
    don't want the RAG to "discover" a different monument.
    """
    _ensure_loaded()
    assert _matrix is not None and _chunks is not None

    q = _embed_query(query)  # (D,)

    if monument_name:
        # Constrained search: only rows belonging to this monument.
        # The monument_name from the registry may include "—" and "#";
        # the index keys are cleaned (stripped, no "#"), so clean the input.
        clean = monument_name.replace("#", "").strip()
        idx = _monument_indices.get(clean)
        if idx is None or len(idx) == 0:
            logger.warning(
                "No chunks found for monument '%s'; falling back to "
                "global search.", monument_name,
            )
            idx = None
        if idx is not None:
            sub_matrix = _matrix[idx]  # (M, D)
            scores = sub_matrix @ q  # (M,)
            k = min(top_k, len(idx))
            if k <= 0:
                return []
            top_local = np.argpartition(-scores, k - 1)[:k]
            top_local = top_local[np.argsort(-scores[top_local])]
            return [(float(scores[i]), _chunks[idx[i]]) for i in top_local]

    # Global search (no monument filter, or monument not found)
    scores = _matrix @ q  # (N,)
    k = min(top_k, len(_chunks))
    top_idx = np.argpartition(-scores, k - 1)[:k]
    top_idx = top_idx[np.argsort(-scores[top_idx])]
    return [(float(scores[i]), _chunks[i]) for i in top_idx]


def build_context(chunks: list[tuple[float, dict]], max_chars_per_chunk: int = 800) -> str:
    """Stitch retrieved chunks into a single context string for the prompt."""
    parts: list[str] = []
    for _score, chunk in chunks:
        text = chunk["text"][:max_chars_per_chunk]
        parts.append(text)
    return "\n---\n".join(parts)


def pick_persona(chunks: list[tuple[float, dict]]) -> tuple[dict | None, str, str, str]:
    """
    Given retrieved chunks, pick the dominant monument's historical persona.

    Returns: (persona_dict_or_None, monument_name_clean, builder, key)
    """
    if not chunks:
        return None, "", "", ""
    top = chunks[0][1]
    monument = top["monument"].replace("#", "").strip()
    builder = top["builder"].strip()
    persona, key = get_historical_persona(monument)
    return persona, monument, builder, key


def build_rag_prompt(
    question: str,
    chunks: list[tuple[float, dict]],
    response_mode: str = "direct",
) -> dict:
    """
    Build the full prompt payload for a RAG-backed generation.

    Args:
        question:      The user's question text.
        chunks:        Retrieved (score, chunk_dict) pairs from vector search.
        response_mode: One of "direct", "hikaya", or "presentation".

    Returns a dict with the keys:
        system_prompt  — Arabic instructions (tone, formatting, anti-hallucination)
        user_prompt    — The actual prompt sent as the user turn
        monument       — Cleaned monument name (for logging/UI)
        builder        — Builder/character name (for logging/UI)
        persona_key    — Matched persona key (or cleaned monument name)
    """
    persona, monument, builder, persona_key = pick_persona(chunks)
    context = build_context(chunks)
    instructions = format_persona_instructions(persona)

    # ─── القواعد الأساسية المشتركة بين كل الأوضاع ───
    # (دي القواعد اللي مش بتتغير أبداً مهما كان الـ Mode)
    base_rules = (
        "١. رد بالعربية فقط.\n"
        "٢. اعتمد على المعلومات الموجودة في النص المرجعي كأولوية، "
        "ولكن يمكنك استخدام معرفتك العامة للإجابة على الأسئلة القريبة "
        "من سياق النص طالما بقيت متقمصاً للشخصية.\n"
        "٣. لا تخترع أسماء أو تواريخ أو أحداثًا تاريخية غير موجودة في النص.\n"
        "٤. تكلم بضمير المتكلم كشخصية حقيقية، لا كمرشد سياحي أو موسوعة.\n"
        "٥. 🖼️ **تحذير هام جداً بخصوص الصور:** يمنع منعاً باتاً اختراع أو تأليف روابط صور من خيالك. فقط إذا وجدت رابط صورة بصيغة الماركدون `![وصف](رابط)` مكتوباً بوضوح داخل النص المرجعي المُعطى لك، قم بنسخه ولصقه حرفياً كما هو. إذا لم تجد رابطاً، لا تضع أي صورة أبداً.\n"
    )

    # ─── بناء الـ System Prompt حسب الـ Mode ───
    if response_mode == "hikaya":
        # ════════════════════════════════════════════
        # وضع "حكاوي" — الراوي القصصي
        # ════════════════════════════════════════════
        mode_instructions = (
            f"أنت الشخصية التاريخية التالية:\n{instructions}\n\n"
            "─── لكن الآن أنت في وضع الحكاية ───\n"
            "مهمتك تحويل المعلومات التاريخية إلى قصة ممتعة وسهلة.\n\n"
            f"{base_rules}"
            "٦. ⚠️ تعليمات الأسلوب الإلزامية (تتجاوز تعليمات الشخصية أعلاه):\n"
            "   - لا تتكلم بأسلوب ملكي متعالي أو فصحى ثقيلة.\n"
            "   - استخدم عربية فصحى بسيطة وسهلة، كأنك جَدّ بيحكي لحفيده قصة قبل النوم.\n"
            "   - ابدأ دائماً بمدخل قصصي (مثل: 'تخيل معي...' أو 'دعني أحكي لك...' أو 'في زمن بعيد...').\n"
            "   - اسرد الأحداث بتسلسل درامي: (المشكلة → القرار → النتيجة → المفاجأة).\n"
            "   - ادمج الحقائق والتواريخ والأرقام بشكل طبيعي داخل القصة.\n"
            "   - اختم بسؤال تفاعلي يشجع الزائر يسأل أكتر.\n"
            "   - طول الحكاية: بين ٦٠ و١٠٠ كلمة.\n"
        )
        user_ending = (
            "احكيلي الحكاية دي بأسلوب سهل وبسيط كأنك جدي بيحكيلي قصة، "
            "مش بأسلوب ملكي. ادمج الحقائق والتواريخ جوه القصة:"
        )

    elif response_mode == "presentation":
        # ════════════════════════════════════════════
        # وضع "العرض" — أسلوب TED Talk
        # ════════════════════════════════════════════
        mode_instructions = (
            f"أنت الشخصية التاريخية التالية:\n{instructions}\n\n"
            "─── لكن الآن أنت في وضع العرض التقديمي ───\n"
            "مهمتك تقديم المعلومات بشكل منظم ومذهل.\n\n"
            f"{base_rules}"
            "٦. ⚠️ تعليمات الأسلوب الإلزامية (تتجاوز تعليمات الشخصية أعلاه):\n"
            "   - نظم إجابتك في نقاط مرقمة واضحة (١، ٢، ٣).\n"
            "   - ابدأ بحقيقة مذهلة أو سؤال يشد الانتباه.\n"
            "   - اذكر كل الأرقام والتواريخ والحقائق المحددة من النص المرجعي.\n"
            "   - اكتب بعربية واضحة ومباشرة، تجنب البلاغة الزائدة.\n"
            "   - اختم بسؤال يفتح باب النقاش.\n"
            "   - طول العرض: بين ٦٠ و١٠٠ كلمة.\n"
        )
        user_ending = (
            "قدم المعلومة دي كأنك في عرض TED Talk، منظم بنقاط مرقمة "
            "وبأرقام وحقائق واضحة. تجنب الأسلوب الدرامي:"
        )

    else:
        # ════════════════════════════════════════════
        # وضع "مباشر" — الوضع الحالي (Default)
        # ════════════════════════════════════════════
        mode_instructions = (
            "أنت محرك شخصيات تاريخية مصرية. مهمتك تجسيد شخصية حقيقية من التراث "
            "المصري بناءً على نص مرجعي موثوق. التزم بالقواعد التالية تمامًا:\n\n"
            f"{base_rules}"
            "٥. حافظ على شخصيتك التاريخية ونبرتك في جميع إجاباتك.\n"
            "٦. اجعل طول إجابتك يعتمد على طبيعة السؤال:\n"
            "   - إذا كان السؤال عن التاريخ أو المعلم الأثري أو يطلب قصة: "
            "اكتب إجابة واضحة (بين ٤٠ و٧٠ كلمة بالضبط)، بجمل قصيرة ومباشرة.\n"
            "   - إذا كان السؤال بسيطاً أو عاماً أو للتحية: أجب باختصار "
            "وبشكل مباشر (من جملة إلى ثلاث جمل كحد أقصى).\n\n"
            f"تعليمات الشخصية:\n{instructions}"
        )
        user_ending = "ردك كشخصية (طول الرد مناسب لنوع السؤال، بجمل قصيرة):"

    system_prompt = mode_instructions

    user_prompt = (
        f"أنت شخصية تاريخية من {monument}.\n"
        f"اسمك أو دورك: {builder}.\n\n"
        f"النص المرجعي:\n{context}\n\n"
        f"سؤال الزائر: {question}\n\n"
        f"{user_ending}"
    )

    return {
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "monument": monument,
        "builder": builder,
        "persona_key": persona_key,
    }


def retrieve_and_build(
    question: str,
    top_k: int = DEFAULT_TOP_K,
    monument_name: str | None = None,
    response_mode: str = "direct",
) -> dict[str, Any]:
    """
    One-shot helper: retrieve chunks + build the prompt payload.

    If `monument_name` is given (exact match to chunk["monument"]), the
    search is constrained to that monument's chunks only.  When a specific
    monument is requested, the persona is looked up directly from the
    monument name instead of relying on fuzzy matching of the top chunk.

    Returns the dict from `build_rag_prompt` plus a `chunks` key holding
    the raw retrieval results (useful for logging / debugging).
    """
    chunks = search(question, top_k=top_k, monument_name=monument_name)
    payload = build_rag_prompt(question, chunks, response_mode=response_mode)
    payload["chunks"] = chunks
    return payload

