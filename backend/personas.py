"""
Voice and identity registry for Hikawi characters.

VOICES maps each voice name to its reference audio and display metadata.
All historical persona instructions (tone, vocabulary, etc.) live in
``services/personas_historical.py`` — this file only holds identity and
voice-cloning data used by the TTS service.

To add a new voice:
    1. Place the reference audio clip in ``data/characters/{voice_name}.mp3``
    2. Add an entry to VOICES below with ``ref_audio_path`` and ``ref_text``
    3. Assign the voice to monuments in ``monuments_registry.py``
       by setting their ``character_name`` to the new voice key
    4. Add matching video files in ``frontend/public/character/``
       (``{voice_name}-idle.mp4`` and ``{voice_name}-talking.mp4``)
"""

import logging

logger = logging.getLogger(__name__)

# ─── Voices ─────────────────────────────────────────────────────────────────
# Key: voice identifier (used as ``character_name`` in monuments_registry.py
#      and sent to the Lightning TTS server for voice cloning).
# ref_audio_path: Path (relative to backend/) to the reference audio clip.
# ref_text:       The exact Arabic text spoken in the reference audio.

VOICES = {
    "am-othman": {
        "name": "عم عثمان",
        "ref_audio_path": "data/characters/am-othman.wav.mp3",
        "ref_text": "لهجة الصعيد لهجة واعرة جوي مش أي حد يتكلمها",
    },
    


    "amr-abdeen": {
        "name": "amr-abdeen",
        "ref_audio_path": "data/characters/Ancient.wav.mp3",
        "ref_text": "واع ثِن خِيِمِت فِي دُو دِي يو سِيسُو سِيفِخو خيمينو بِسيج",
    },

    "amr-abdeen-modern": {
        "name": "عمرو عابدين",
        "ref_audio_path": "data/characters/amr-abdeen-modern.mp3",
        "ref_text": "كرروا موضوع الهجاء الحرفي ده مئات المرات على أسماء الملوك  و المدن اللي زي رمسيس و أحمس و طيبة و كيمت",
    },

    "ramsis": {
        "name": "رمسيس الثاني",
        "ref_audio_path": "data/characters/Ancient.wav.mp3",
        "ref_text": "واع ثِن خِيِمِت فِي دُو دِي يو سِيسُو سِيفِخو خيمينو بِسيج",
    },



    "am-mohamed": {
         "name": "am-mohamed",
        "ref_audio_path": "data/characters/aswan.wav.mp3",
         "ref_text": "ولا في حد نتوَنَّس معاه الناس زمان البتحَكَّى الحكاوي الحلوة دي احسن من الكلام بتاع هنا الشباب اديلو يومين ولا فاهمينه",
    },
}


# ─── Lookup helpers ──────────────────────────────────────────────────────────


def get_voice(voice_name: str) -> dict | None:
    """Return voice config by its identifier, or None."""
    return VOICES.get(voice_name)


def get_voice_by_name(voice_name: str) -> dict | None:
    """Alias kept for backwards compatibility with tts_service."""
    return VOICES.get(voice_name)


def list_voices() -> list[str]:
    """Return all registered voice names."""
    return list(VOICES.keys())
