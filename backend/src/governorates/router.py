from fastapi import APIRouter

from src.governorates.utils import get_all_governorates

router = APIRouter(tags=["governorates"])


@router.get("/api/governorates")
async def list_governorates():
    """
    Return all governorates with their monuments nested.

    Each monument includes: key, display_name, builder, title, bio, lat,
    lng, character_name (TTS voice id, currently "am-othman" for all),
    chips (suggested quick-reply questions), and monument_name (the exact
    key used to filter RAG chunks).
    """
    return {"governorates": get_all_governorates()}
