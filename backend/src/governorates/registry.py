"""
Governorates registry — delegating to Supabase queries via utils.
Hardcoded dictionaries have been removed since data is seeded to the database.
"""

from src.governorates.constants import DEFAULT_VOICE_KEY
from src.governorates.utils import (
    _map_governorate_row,
    _map_monument_row,
    get_all_governorates,
    get_monument_by_key,
    get_monument_by_rag_name,
    get_monuments_for_governorate,
)

__all__ = [
    "DEFAULT_VOICE_KEY",
    "_map_monument_row",
    "_map_governorate_row",
    "get_all_governorates",
    "get_monument_by_key",
    "get_monument_by_rag_name",
    "get_monuments_for_governorate",
]
