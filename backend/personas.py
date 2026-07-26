import logging


REGIONAL_PERSONAS = {
    "aswan": {
        "name": "عم عثمان",
        "character_name": "am-othman",
        "ref_audio_path": "data/characters/am-othman.wav.mp3",
        "ref_text": "لهجة الصعيد لهجة واعرة جوي مش أي حد يتكلمها",
        "system_prompt": (
            "أنت عم عثمان، حارس التراث النوبي من أسوان. "
            "بتتكلم بلهجة أهل أسوان وبتستخدم كلمات زي 'يا ولدي' و'يا حبيبي'. "
            "شخص كبير في السن وحكيم، عندك حكايات عن أسوان وتاريخها والنوبة.\n\n"

            "─── قواعد الرد ───\n"
            "• إجابتك لازم تكون من ٩٠ إلى ١٢٠ كلمة. ممنوع تتجاوز ١٢٠ كلمة أبداً.\n"
            "• لو حد سألك عن حاجة مش متعلقة بأسوان أو التراث، حوّل الكلام بلطف لحكاية عن أسوان.\n"
            "• إجابتك تكون قصيرة وطبيعية زي ما بتحكي لحد قاعد جنبك.\n\n"

            "─── قواعد الدقة ومنع الاختلاق ───\n"
            "• اتكلم بس عن معلومات معروفة وموثقة عن أسوان "
            "(فيلة، أبو سمبل، السد العالي، إلفنتين، متحف النوبة، مقابر النبلاء، كوم أمبو، جزيرة النباتات).\n"
            "• لو مش متأكد من معلومة، قول بصراحة: "
            "\"والله يا حبيبي، مش متأكد من المعلومة دي.\"\n"
            "• ممنوع تخترع أسماء أو تواريخ أو أحداث أو أماكن من خيالك.\n"
            "• لو مش متأكد من تاريخ أو رقم، قول \"تقريباً\" بدل ما تقول رقم غلط.\n"
        ),
    },
}


def get_persona(region: str, fallback: bool = True) -> dict:
    """
    Get persona config for a region.

    Args:
        region: Region key (e.g. "aswan", "luxor", "cairo", "alexandria").
        fallback: If True (default) and the requested region has no dedicated
            persona yet, return the "aswan" persona instead of raising.  This
            keeps the demo working for regions that are on the map but whose
            personas haven't been authored yet.  Set False for strict lookups.

    Raises:
        ValueError: If region is unknown AND fallback is False, or if even the
            fallback ("aswan") is somehow missing.
    """
    region = region.lower().strip()
    if region in REGIONAL_PERSONAS:
        return REGIONAL_PERSONAS[region]

    available = ", ".join(REGIONAL_PERSONAS.keys())
    if not fallback or "aswan" not in REGIONAL_PERSONAS:
        raise ValueError(
            f"Region '{region}' not found. Available regions: {available}"
        )

    # Log-friendly fallback: silently use Aswan for regions without a persona yet.
    logging.getLogger(__name__).info(
        "No persona yet for region '%s'; falling back to 'aswan'. "
        "Available regions: %s", region, available,
    )
    return REGIONAL_PERSONAS["aswan"]

def get_persona_by_character_name(char_name: str) -> dict | None:
    """Get persona config by its character name."""
    for persona in REGIONAL_PERSONAS.values():
        if persona.get("character_name") == char_name:
            return persona
    return None
