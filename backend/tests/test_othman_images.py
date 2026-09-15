"""Photo selection and API persistence checks; no database or AI calls."""

from pathlib import Path
from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.auth import get_current_user_id
from src.chat import router as chat
from src.chat.othman_images import (
    FELUCCA_IMAGE, PANORAMA_IMAGE, add_othman_image, strip_images,
)
from src.chat.rag_service import build_rag_prompt
from src.characters import router as characters
from src.characters.schemas import TTSRequest


FIRST_QUESTION = "يا عم عثمان، لو أنا أول مرة أجي أسوان وعايز أعرفها من أهلها، مش كسائح بيجري ورا المعالم… تبدأ معايا منين؟"
FOLLOW_UP = "طيب بما إننا بنتكلم عن النوبة… هل ينفع نقول إن أسوان كلها نوبية؟"


@pytest.mark.parametrize("question,reply,expected", [
    (FIRST_QUESTION, "أبدأ بيك من النيل. اركب فلوكة وبعدها شوف القرى النوبية. دي واحدة من حكاوي أسوان، مش حكاية أسوان كلها.", FELUCCA_IMAGE),
    (FOLLOW_UP, "لأ، دي واحدة من حكاوي أسوان. والنيل بيجمعنا.", PANORAMA_IMAGE),
    ("احكيلي عن الفُلُوكَة", "تعالى نشوف الجزر.", FELUCCA_IMAGE),
    ("Is all of Aswan Nubian?", "There are many stories along the Nile.", PANORAMA_IMAGE),
    ("إيه حكاية تنوع أسوان؟", "أسوان فيها قرى كتير.", PANORAMA_IMAGE),
    ("احكيلي عن نيل أسوان", "هتلاقي ثقافات متعددة على الضفتين.", FELUCCA_IMAGE),
])
def test_relevant_photo_is_present_even_when_model_omits_it(question, reply, expected):
    result = add_othman_image(reply, question, "aswan-general")
    assert result == f"{reply}\n\n{expected}"
    assert result.count("![") == 1


def test_replaces_old_or_wrong_images_without_duplicates():
    reply = "أسوان فيها حكايات كتير.\n![النوبة](/images/monuments/nubian_village.jpg)"
    result = add_othman_image(reply, FOLLOW_UP, "aswan-general")
    assert result.endswith(PANORAMA_IMAGE)
    assert "nubian_village" not in result
    assert add_othman_image(result, FOLLOW_UP, "aswan-general") == result


@pytest.mark.parametrize("context", ["abu-simbel", "philae", "giza-general", None])
def test_other_characters_keep_their_images(context):
    reply = "حكاية النيل. ![المعبد](/images/monuments/relocation.jpg)"
    assert add_othman_image(reply, "النيل", context) == reply


def test_unrelated_reply_and_empty_response_do_not_get_a_photo():
    assert add_othman_image("أهلاً يا ولدي", "صباح الخير", "aswan-general") == "أهلاً يا ولدي"
    assert add_othman_image("", "النيل", "aswan-general") == ""
    assert add_othman_image("الأكل النوبي لذيذ.", "الأكل النوبي؟", "aswan-general") == "الأكل النوبي لذيذ."


def test_photo_links_and_captions_are_not_spoken():
    assert strip_images(f"أبدأ بيك من النيل.\n\n{FELUCCA_IMAGE}") == "أبدأ بيك من النيل."


@pytest.mark.parametrize("question", [
    "حدثني عن السلال النوبية", "احكيلي عن الأكل النوبي", "صباح الخير",
    "أول مرة أعمل سلة نوبية، أبدأ إزاي؟",
])
@pytest.mark.parametrize("photo", ["", FELUCCA_IMAGE, PANORAMA_IMAGE])
def test_incidental_nile_mention_does_not_attach_curated_photos(question, photo):
    reply = "السلال من خوص النخيل، وكل سلة فيها ريحة النيل ودفء الشمس."
    result = add_othman_image(f"{reply}\n\n{photo}", question, "aswan-general")
    assert result == reply


def test_unrelated_photo_is_preserved_for_craft_question():
    reply = "حرفة نوبية. ![سلة](/images/basket.jpg)"
    assert add_othman_image(reply, "حدثني عن السلال النوبية", "aswan-general") == reply


@pytest.mark.parametrize("character", ["am-othman", "ramsis", "amr-abdeen-modern", "khufu"])
def test_tts_endpoint_strips_images_for_every_character(monkeypatch, character):
    synthesize = Mock(return_value=("test.wav", None))
    monkeypatch.setattr(characters, "synthesize_speech", synthesize)
    characters.text_to_speech(TTSRequest(
        text=f"النيل جميل.\n\n{FELUCCA_IMAGE}", character_name=character,
    ))
    assert synthesize.call_args.kwargs["text"] == "النيل جميل."


@pytest.mark.parametrize("mode", ["modern", "ancient"])
def test_ramses_chat_keeps_photo_visible_but_out_of_speech(photo_api, monkeypatch, mode):
    client, save = photo_api
    picture = "![إنقاذ معبد أبو سمبل](/images/monuments/relocation.jpg)"
    reply = f"نقلوا معبدي لإنقاذه.\n{picture}\nثم أعادوا تركيبه."
    monkeypatch.setattr(chat, "get_monument_by_key", lambda _: {
        "monument_name": "أبو سمبل — رمسيس الثاني", "display_name": "أبو سمبل",
        "character_name": "ramsis",
    })
    monkeypatch.setattr(chat, "generate", lambda **kw: reply)
    monkeypatch.setattr(chat, "generate_with_ancient", lambda **kw: (reply, reply))
    response = client.post("/api/chat/ancient", json={
        "text": "كيف تم نقل المعبد؟", "monument_key": "abu-simbel", "language_mode": mode,
    })
    assert response.status_code == 200
    data = response.json()
    assert picture in data["response"]
    assert "إنقاذ معبد أبو سمبل" not in data["tts_text"]
    assert "/images/" not in data["tts_text"]
    assert "نقلوا معبدي" in data["tts_text"]
    assert "أعادوا تركيبه" in data["tts_text"]
    assert save.call_args.kwargs["metadata"]["tts_text"] == data["tts_text"]


def test_curated_assets_exist_in_frontend():
    public = Path(__file__).resolve().parents[2] / "frontend" / "public"
    for filename in ("aswan_felucca.jpg", "aswan_panorama.jpg"):
        photo = public / "images" / "monuments" / filename
        assert photo.read_bytes().startswith(b"\xff\xd8")


def test_rag_prompt_supplies_othman_photos():
    payload = build_rag_prompt(FIRST_QUESTION, [(0.9, {
        "monument": "أسوان — أرض الذهب", "builder": "عم عثمان", "text": "النيل في أسوان.",
    })])
    assert FELUCCA_IMAGE in payload["system_prompt"]
    assert PANORAMA_IMAGE in payload["system_prompt"]


@pytest.fixture
def photo_api(monkeypatch):
    app = FastAPI()
    app.include_router(chat.router)
    app.dependency_overrides[get_current_user_id] = lambda: "test-user"
    monkeypatch.setattr(chat, "get_history", lambda _: [])
    monkeypatch.setattr(chat, "rag_is_ready", lambda: True)
    monkeypatch.setattr(chat, "get_monument_by_key", lambda _: {
        "monument_name": "أسوان — أرض الذهب", "display_name": "عم عثمان",
        "character_name": "am-othman",
    })
    monkeypatch.setattr(chat, "retrieve_and_build", lambda *a, **kw: {
        "system_prompt": "test", "user_prompt": "test", "chunks": [],
        "monument": "أسوان — أرض الذهب", "builder": "عم عثمان",
        "persona_key": "أسوان — أرض الذهب",
    })
    monkeypatch.setattr(chat, "generate", lambda **kw: f"النيل بيجمع حكايات كتير.\n{FELUCCA_IMAGE}")
    monkeypatch.setattr(chat, "generate_with_ancient", lambda **kw: (
        "النيل بيجمع حكايات كتير.", "spoken ancient text",
    ))
    monkeypatch.setattr(chat, "_transcribe_audio", lambda *a: FOLLOW_UP)
    monkeypatch.setattr(chat, "log_pipeline_metrics", lambda _: None)
    save = Mock(return_value="saved-session")
    monkeypatch.setattr(chat, "save_chat_turn", save)
    with TestClient(app) as client:
        yield client, save


@pytest.mark.parametrize("mode", ["modern", "ancient"])
def test_map_reply_saves_the_panorama_and_keeps_tts_separate(photo_api, mode):
    client, save = photo_api
    response = client.post("/api/chat/ancient", json={
        "text": FOLLOW_UP, "monument_key": "aswan-general", "language_mode": mode,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["response"].endswith(PANORAMA_IMAGE)
    assert "![" not in data["tts_text"]
    assert "/images/" not in data["tts_text"]
    assert save.call_args.kwargs["response"] == data["response"]
    assert save.call_args.kwargs["metadata"]["tts_text"] == data["tts_text"]


@pytest.mark.parametrize("endpoint", ["text", "audio"])
def test_regional_endpoints_save_the_photo(photo_api, endpoint):
    client, save = photo_api
    if endpoint == "text":
        response = client.post("/api/chat/text", json={"text": FOLLOW_UP, "region": "aswan"})
    else:
        response = client.post("/api/chat/audio", data={"region": "aswan"}, files={
            "file": ("recording.webm", b"test recording", "audio/webm"),
        })
    assert response.status_code == 200
    assert response.json()["response"].endswith(PANORAMA_IMAGE)
    assert save.call_args.kwargs["response"] == response.json()["response"]


def test_family_reply_is_not_decorated_as_othman(photo_api, monkeypatch):
    client, _ = photo_api
    monkeypatch.setattr(chat, "build_family_prompt", lambda *a: "family prompt")
    monkeypatch.setattr(chat, "generate", lambda **kw: "النيل جميل.")
    response = client.post("/api/chat/text", json={
        "text": "احكيلي عن النيل", "region": "aswan",
        "persona": "family_member", "member_name": "فاطمة",
    })
    assert response.status_code == 200
    assert response.json()["response"] == "النيل جميل."
