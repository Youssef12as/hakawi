from __future__ import annotations
from typing import Any

from src.database import get_db_cursor
from src.governorates.constants import DEFAULT_VOICE_KEY


def _map_monument_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": row["key"],
        "governorate": row["governorate_key"],
        "monument_name": row["monument_name"],
        "display_name": row["display_name"],
        "builder": row["builder"],
        "title": row.get("title") or "",
        "bio": row.get("bio") or "",
        "lat": float(row["lat"]) if row.get("lat") is not None else 0.0,
        "lng": float(row["lng"]) if row.get("lng") is not None else 0.0,
        "character_name": row.get("ancient_voice_key") or row.get("modern_voice_key") or DEFAULT_VOICE_KEY,
        "modern_voice_key": row.get("modern_voice_key"),
        "ancient_voice_key": row.get("ancient_voice_key"),
        "chips": row.get("chips") if isinstance(row.get("chips"), list) else [],
        "idle_video_url": row.get("idle_video_url"),
        "talking_video_url": row.get("talking_video_url"),
        "avatar_url": row.get("avatar_url"),
    }


def _map_governorate_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": row["key"],
        "name": row["name_ar"],
        "name_en": row["name_en"],
        "lat": float(row["lat"]) if row.get("lat") is not None else 0.0,
        "lng": float(row["lng"]) if row.get("lng") is not None else 0.0,
    }


def get_all_governorates() -> list[dict[str, Any]]:
    """Return all governorates with their monuments nested directly from Supabase."""
    with get_db_cursor() as cur:
        cur.execute("SELECT key, name_ar, name_en, lat, lng FROM public.governorates ORDER BY key;")
        gov_rows = cur.fetchall()

        cur.execute("""
            SELECT key, governorate_key, modern_voice_key, ancient_voice_key,
                   monument_name, display_name, builder, title, bio, lat, lng, chips,
                   idle_video_url, talking_video_url, avatar_url
            FROM public.monuments
            ORDER BY key;
        """)
        mon_rows = cur.fetchall()

    monuments_by_gov: dict[str, list[dict[str, Any]]] = {}
    for m in mon_rows:
        mapped_m = _map_monument_row(m)
        gov_key = mapped_m["governorate"]
        monuments_by_gov.setdefault(gov_key, []).append(
            {k: v for k, v in mapped_m.items() if k != "governorate"}
        )

    result = []
    for g in gov_rows:
        gov_dict = _map_governorate_row(g)
        gov_dict["monuments"] = monuments_by_gov.get(g["key"], [])
        result.append(gov_dict)
    return result


def get_monument_by_key(key: str) -> dict[str, Any] | None:
    """Look up a monument by its key directly from Supabase."""
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT key, governorate_key, modern_voice_key, ancient_voice_key,
                   monument_name, display_name, builder, title, bio, lat, lng, chips,
                   idle_video_url, talking_video_url, avatar_url
            FROM public.monuments
            WHERE key = %s;
        """, (key,))
        row = cur.fetchone()
        if not row:
            return None
        return _map_monument_row(row)


def get_monument_by_rag_name(rag_name: str) -> dict[str, Any] | None:
    """Look up a monument by its exact RAG chunk name directly from Supabase."""
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT key, governorate_key, modern_voice_key, ancient_voice_key,
                   monument_name, display_name, builder, title, bio, lat, lng, chips,
                   idle_video_url, talking_video_url, avatar_url
            FROM public.monuments
            WHERE monument_name = %s;
        """, (rag_name,))
        row = cur.fetchone()
        if not row:
            return None
        return _map_monument_row(row)


def get_monuments_for_governorate(governorate_key: str) -> list[dict[str, Any]]:
    """Return all monuments in a governorate directly from Supabase."""
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT key, governorate_key, modern_voice_key, ancient_voice_key,
                   monument_name, display_name, builder, title, bio, lat, lng, chips,
                   idle_video_url, talking_video_url, avatar_url
            FROM public.monuments
            WHERE governorate_key = %s
            ORDER BY key;
        """, (governorate_key,))
        rows = cur.fetchall()
        return [_map_monument_row(r) for r in rows]
