from src.chat.historical_prompts import HISTORICAL_PERSONAS
from src.chat.utils import format_persona_instructions, get_historical_persona


def test_personas_are_loaded_from_the_dedicated_local_module():
    """Runtime persona lookup must not depend on database or seed fixtures."""
    persona, key = get_historical_persona("أبو سمبل — رمسيس الثاني")

    assert key == "أبو سمبل — رمسيس الثاني"
    assert persona is HISTORICAL_PERSONAS[key]


def test_local_persona_can_be_formatted_into_prompt_instructions():
    persona, _ = get_historical_persona("الهرم الأكبر — خوفو")

    instructions = format_persona_instructions(persona)

    assert persona is not None
    assert persona["tone"] in instructions
    assert persona["on_unknown"] in instructions
