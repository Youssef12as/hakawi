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
    )):
        return FELUCCA_IMAGE
    if ("اسوان" in text or "aswan" in text) and any(phrase in text for phrase in (
        "اجي اسوان", "ازور اسوان", "زياره اسوان", "اول زياره", "first visit", "visiting aswan",
    )):
        return FELUCCA_IMAGE
    return None


def add_othman_image(response: str, question: str, context: str | None) -> str:
    """Attach one relevant photo before saving, even when generation omits it.

    Select from the visitor's question only. Incidental words in a generated
    answer must not trigger these photos. Remove these two curated photos from
    off-topic replies even if the model copied them from its prompt.
    """
    if not response or not response.strip() or not is_othman(context):
        return response
    selected = _topic_image(question)
    if selected is None:
        curated_urls = {
            "/images/monuments/aswan_felucca.jpg",
            "/images/monuments/aswan_panorama.jpg",
            "/images/monuments/aswan_nile.jpg",
        }
        return _IMAGE.sub(
            lambda match: "" if match.group(0).rsplit("(", 1)[1][:-1].strip() in curated_urls else match.group(0),
            response,
        ).strip()
    # Replace model-selected/old photos and avoid duplicates on repeated calls.
    return f"{strip_images(response)}\n\n{selected}"


OTHMAN_IMAGE_INSTRUCTIONS = (
    "\n\nصور حكاوي أسوان المعتمدة:\n"
    f"- فقط إذا كان سؤال الزائر عن النيل أو ركوب الفلوكة أو زيارة أسوان: {FELUCCA_IMAGE}\n"
    f"- فقط إذا كان سؤال الزائر عن تنوع أسوان أو هل كل أهلها نوبيون: {PANORAMA_IMAGE}\n"
    "استخدم صورة واحدة مناسبة لموضوع السؤال، ولا تخترع روابط صور. "
    "ذكر النيل مجازًا أو عرضًا في إجابتك لا يبرر إضافة صورته. "
    "لا تضف صور النيل أو بانوراما أسوان لأسئلة السلال أو الحرف أو الأكل أو التحية. "
    "إذا كان السؤال عن تنوع أهل أسوان، اختر البانوراما حتى لو ذكرت النيل."
)
