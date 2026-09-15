"""Curated photos for Othman's replies, using the existing Markdown image format."""

import re


FELUCCA_IMAGE = (
    "![فلوكة في نيل أسوان — الحكاية تبدأ من النيل.]"
    "(/images/monuments/aswan_felucca.jpg)"
)
PANORAMA_IMAGE = (
    "![أسوان — مكان واحد، وحكايات وثقافات متعددة.]"
    "(/images/monuments/aswan_panorama.jpg)"
)
_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]+\)")


def _normalize(text: str) -> str:
    text = re.sub(r"[\u064b-\u065f\u0670ـ]", "", text.lower())
    return text.translate(str.maketrans("أإآىة", "ااايه"))


def is_othman(context: str | None) -> bool:
    # Match the regional persona, not Ramses/Philae just because they are in Aswan.
    return _normalize(context or "").strip() in {
        "aswan", "aswan-general", "am-othman", "عم عثمان", "اسوان",
        "اسوان — ارض الذهب",
    }


def strip_images(text: str) -> str:
    """Keep image captions and URLs out of the spoken response."""
    return _IMAGE.sub("", text).strip()


def _topic_image(text: str) -> str | None:
    text = _normalize(strip_images(text))
    diversity = any(word in text for word in (
        "تنوع", "متنوع", "متعدد", "ثقافات", "لهجات", "تمثل", "بتمثل",
        "diversity", "diverse", "cultures", "represent",
    )) or (
        ("نوبي" in text or "النوبه" in text or "nubian" in text)
        and re.search(r"\b(?:كل|كلها|كلهم|كله|جميع|all|everyone|entire|whole)\b", text)
    )
    if diversity:
        return PANORAMA_IMAGE
    if any(word in text for word in (
        "نيل", "فلوك", "مراكب", "شراع", "nile", "felucca", "sailing",
        "اول مره", "اول زياره", "first visit", "first time",
    )):
        return FELUCCA_IMAGE
    return None


def add_othman_image(response: str, question: str, context: str | None) -> str:
    """Attach one relevant photo before saving, even when generation omits it.

    The visitor's explicit topic takes precedence over incidental reply words.
    Unrelated replies and other characters retain their existing images.
    """
    if not response or not response.strip() or not is_othman(context):
        return response
    selected = _topic_image(question) or _topic_image(response)
    if selected is None:
        return response
    # Replace model-selected/old photos and avoid duplicates on repeated calls.
    return f"{strip_images(response)}\n\n{selected}"


OTHMAN_IMAGE_INSTRUCTIONS = (
    "\n\nصور حكاوي أسوان المعتمدة:\n"
    f"- عند الحديث عن النيل أو ركوب الفلوكة: {FELUCCA_IMAGE}\n"
    f"- عند الحديث عن تنوع أسوان أو هل كل أهلها نوبيون: {PANORAMA_IMAGE}\n"
    "استخدم صورة واحدة مناسبة لموضوع السؤال، ولا تخترع روابط صور. "
    "إذا كان السؤال عن تنوع أهل أسوان، اختر البانوراما حتى لو ذكرت النيل."
)
