"""Seed fixtures used solely by seed_supabase.py to initialize the database."""

GOVERNORATES = [
    {
        "key": "aswan",
        "name": "أسوان والنوبة",
        "name_en": "Aswan & Nubia",
        "lat": 24.0889,
        "lng": 32.8998,
    },
    {
        "key": "luxor",
        "name": "الأقصر وطيبة",
        "name_en": "Luxor & Thebes",
        "lat": 25.6872,
        "lng": 32.6396,
    },
    {
        "key": "cairo",
        "name": "القاهرة والجيزة",
        "name_en": "Cairo & Giza",
        "lat": 30.0444,
        "lng": 31.2357,
    },
    {
        "key": "alexandria",
        "name": "الإسكندرية",
        "name_en": "Alexandria",
        "lat": 31.2001,
        "lng": 29.9187,
    },
]

# ─── Monuments ──────────────────────────────────────────────────────────────
# `monument_name` MUST match chunk["monument"] in embeddings.json exactly.
# `chips` are short suggested questions shown as quick-reply buttons; they
# are sent through the RAG pipeline (not hardcoded) so every answer is
# grounded in the retrieved context.

MONUMENTS = [
    # ── Aswan ───────────────────────────────────────────────────────────
    {
        "key": "aswan-general",
        "governorate": "aswan",
        "monument_name": "أسوان — أرض الذهب",
        "display_name": "أسوان",
        "builder": "عم عثمان",
        "title": "حارس بوابة الجنوب",
        "bio": "أسوان هي بداية الحكاية، ونهاية التعب. هنا النيل بيجري هادي، والصخور بتحفظ الأسرار.",
        "lat": 24.0889,
        "lng": 32.8998,
        "character_name": "am-othman",
        "chips": ["احكيلي عن النوبة", "ليه أسوان اتسمت بالاسم ده؟", "إيه أجمل مكان في أسوان؟"],
    },
    {
        "key": "abu-simbel",
        "governorate": "aswan",
        "monument_name": "أبو سمبل — رمسيس الثاني",
        "display_name": "أبو سمبل",
        "builder": "رمسيس الثاني",
        "title": "فرعون مصر العظيم",
        "bio": "نحتُّ وجهي في الجبل أربع مرات. هنا في النوبة، حيث تلتقي الشمس بالأبدية.",
        "lat": 22.3436,
        "lng": 31.6256,
        "character_name": "ramsis",
        "chips": ["حدثني عن معركة قادش", "ما سر توجه الشمس إلى المعبد؟", "من هي نفرتاري بالنسبة لك؟"],
    },
    {
        "key": "philae",
        "governorate": "aswan",
        "monument_name": "معبد فيلة — إيزيس + بطليموس الثاني",
        "display_name": "معبد فيلة",
        "builder": "إيزيس + بطليموس الثاني",
        "title": "إلهة النيل والحب",
        "bio": "بحثت عن أوزوريس في كل زاوية من زوايا النيل. وفيلة كانت مكان السكينة.",
        "lat": 24.0247,
        "lng": 32.8836,
        "character_name": "am-othman",
        "chips": ["احكيلي قصة إيزيس وأوزوريس", "لماذا بُني معبد فيلة؟", "ما علاقة البطالمة بالمعبد؟"],
    },
    {
        "key": "unfinished-obelisk",
        "governorate": "aswan",
        "monument_name": "المسلة الناقصة — حتشبسوت / رئيس عمّال المحاجر",
        "display_name": "المسلة الناقصة",
        "builder": "رئيس عمّال المحاجر",
        "title": "حرفي الجرانيت الأسواني",
        "bio": "ما خلصناش المسلة دي. بس الحجر الناقص بيحكي أكتر من التام.",
        "lat": 24.0889,
        "lng": 32.8998,
        "character_name": "am-othman",
        "chips": ["لماذا لم تكتمل المسلة؟", "كيف كنتم تنحتون الجرانيت؟", "ما سر الكسر في المسلة؟"],
    },
    {
        "key": "aga-khan",
        "governorate": "aswan",
        "monument_name": "ضريح الآغا خان — الآغا خان الثالث",
        "display_name": "ضريح الآغا خان",
        "builder": "الآغا خان الثالث",
        "title": "إمام روحي عصري",
        "bio": "اخترت أسوان لأن هواءها يشبه الصمت الذي يحتاجه الروح.",
        "lat": 24.0736,
        "lng": 32.8819,
        "character_name": "am-othman",
        "chips": ["لماذا اختار الآغا خان أسوان؟", "احكيلي عن حياته", "ما أهمية الموقع؟"],
    },
    # ── Luxor ───────────────────────────────────────────────────────────
    {
        "key": "hatshepsut-temple",
        "governorate": "luxor",
        "monument_name": "معبد حتشبسوت بالدير البحري — حتشبسوت",
        "display_name": "معبد حتشبسوت",
        "builder": "حتشبسوت",
        "title": "الملكة الفرعون",
        "bio": "محوا اسمي من الحجر، فظنوا أنهم محوني. لكن البناء بقي، والبناء أنا.",
        "lat": 25.7373,
        "lng": 32.6014,
        "character_name": "am-othman",
        "chips": ["لماذا بُني المعبد في الجبل؟", "احكيلي عن رحلة بونت", "لماذا محا تحتمس اسمك؟"],
    },
    {
        "key": "tutankhamun-tomb",
        "governorate": "luxor",
        "monument_name": "مقبرة توت عنخ آمون KV62 — توت عنخ آمون",
        "display_name": "مقبرة توت عنخ آمون",
        "builder": "توت عنخ آمون",
        "title": "الفرعون الشاب",
        "bio": "يرونني كنزًا. وأنا كنت ملكًا يحاول أن يفهم مملكته قبل أن يفهمه التاريخ.",
        "lat": 25.7398,
        "lng": 32.6014,
        "character_name": "am-othman",
        "chips": ["كيف اكتُشفت مقبرتك؟", "ما هي لعنة الفراعنة؟", "لماذا غيرت اسمك؟"],
    },
    {
        "key": "karnak",
        "governorate": "luxor",
        "monument_name": "توسعات الكرنك — تحتمس الثالث",
        "display_name": "توسعات الكرنك",
        "builder": "تحتمس الثالث",
        "title": "الفرعون المحارب الباني",
        "bio": "لم أمح اسمها انتقامًا. كان الزمن يستدعي أن يكون الملك واضحًا.",
        "lat": 25.7188,
        "lng": 32.6573,
        "character_name": "am-othman",
        "chips": ["احكيلي عن معركة مجدو", "ما هي الغرفة النباتية؟", "لماذا وسّعت الكرنك؟"],
    },
    {
        "key": "nefertari-tomb",
        "governorate": "luxor",
        "monument_name": "مقبرة نفرتاري QV66 — الملكة نفرتاري",
        "display_name": "مقبرة نفرتاري",
        "builder": "الملكة نفرتاري",
        "title": "أجمل مقابر وادي الملكات",
        "bio": "دخلت مقبرتي فرأيت الألوان. لم تكن زينة فقط، كانت لغة تكلم بها المصري القديم الآلهة.",
        "lat": 25.7517,
        "lng": 32.5986,
        "character_name": "am-othman",
        "chips": ["لماذا مقبرتك بهذه الألوان؟", "ما علاقتك برمسيس الثاني؟", "من هي حتحور؟"],
    },
    {
        "key": "deir-el-medina",
        "governorate": "luxor",
        "monument_name": "دير المدينة — صوت العمال + أمنحتب الأول",
        "display_name": "دير المدينة",
        "builder": "صوت العمال + أمنحتب الأول",
        "title": "قرية الحرفيين",
        "bio": "إحنا اللي بنينا مقابر الملوك، وماحدش كان بيسأل عنا. لحد ما الأوستراكا حكت.",
        "lat": 25.7283,
        "lng": 32.6014,
        "character_name": "am-othman",
        "chips": ["احكيلي عن إضراب العمال", "كيف كنتم تعيشون؟", "ما هي الأوستراكا؟"],
    },
    # ── Cairo / Giza ────────────────────────────────────────────────────
    {
        "key": "great-pyramid",
        "governorate": "cairo",
        "monument_name": "الهرم الأكبر — خوفو",
        "display_name": "الهرم الأكبر",
        "builder": "خوفو",
        "title": "باني الهرم الأكبر",
        "bio": "أنت ترى حجارة، أما أنا فكنت أرى أفقًا. كل كتلة وُضعت كي لا ينكسر اسمي.",
        "lat": 29.9792,
        "lng": 31.1342,
        "character_name": "am-othman",
        "chips": ["كيف بُني الهرم الأكبر؟", "ما هو آخت خوفو؟", "ماذا يوجد داخل الهرم؟"],
    },
    {
        "key": "step-pyramid",
        "governorate": "cairo",
        "monument_name": "هرم زوسر المدرج — زوسر + إيمحتب",
        "display_name": "هرم زوسر المدرج",
        "builder": "زوسر + إيمحتب",
        "title": "أول هرم في التاريخ",
        "bio": "لم أبنِ هرمًا. بنيتُ فكرة: أن الإنسان يستطيع أن يصنع ما يبدو مستحيلًا.",
        "lat": 29.8713,
        "lng": 31.2163,
        "character_name": "am-othman",
        "chips": ["من هو إيمحتب؟", "لماذا الهرم مدرج؟", "ما هو أول حجر في التاريخ؟"],
    },
    {
        "key": "bent-pyramid",
        "governorate": "cairo",
        "monument_name": "الهرم المنحني — سنفرو",
        "display_name": "الهرم المنحني",
        "builder": "سنفرو",
        "title": "ملك التجارب",
        "bio": "رأيتم انحناء هرمي فظننتم أنه نقص. أنا أقول لكم: هو درس.",
        "lat": 29.7915,
        "lng": 31.2083,
        "character_name": "am-othman",
        "chips": ["لماذا هرمك منحني؟", "ما قصة الهرم الأحمر؟", "كم هرماً بنيت؟"],
    },
    {
        "key": "ibn-tulun",
        "governorate": "cairo",
        "monument_name": "مسجد أحمد بن طولون — أحمد بن طولون",
        "display_name": "مسجد أحمد بن طولون",
        "builder": "أحمد بن طولون",
        "title": "والي طموح",
        "bio": "بنيت مسجدًا لا يشبه القاهرة، بل يشبه طموحي.",
        "lat": 30.0311,
        "lng": 31.2361,
        "character_name": "am-othman",
        "chips": ["لماذا المنارة الحلزونية؟", "ما هي القطائع؟", "احكيلي عن سامراء"],
    },
    {
        "key": "azhar",
        "governorate": "cairo",
        "monument_name": "الجامع الأزهر — جوهر الصقلي + المعز لدين الله",
        "display_name": "الجامع الأزهر",
        "builder": "جوهر الصقلي + المعز لدين الله",
        "title": "تأسيس القاهرة",
        "bio": "بنينا القاهرة في ليلة واحدة بالنجوم. والأزهر لم يكن مسجدًا فقط، كان رسالة.",
        "lat": 30.0459,
        "lng": 31.2628,
        "character_name": "am-othman",
        "chips": ["كيف تأسست القاهرة؟", "لماذا سُمي الأزهر؟", "من هو المعز لدين الله؟"],
    },
    {
        "key": "sultan-hassan",
        "governorate": "cairo",
        "monument_name": "مسجد ومدرسة السلطان حسن — السلطان الناصر حسن",
        "display_name": "مسجد السلطان حسن",
        "builder": "السلطان الناصر حسن",
        "title": "سلطان مملوكي",
        "bio": "بنيت في زمن الوباء. ربما أردت أن أقول للموت: أنا هنا، وأنا أبنى.",
        "lat": 30.0324,
        "lng": 31.2561,
        "character_name": "am-othman",
        "chips": ["كيف بنيت في زمن الطاعون؟", "ما هو الإيوان؟", "احكيلي عن المماليك"],
    },
    {
        "key": "citadel",
        "governorate": "cairo",
        "monument_name": "قلعة القاهرة — صلاح الدين الأيوبي",
        "display_name": "قلعة القاهرة",
        "builder": "صلاح الدين الأيوبي",
        "title": "حامي المدينة",
        "bio": "لم أبنِ قلعة من خوف. بنيتها لأن المدينة تستحق من يحميها بحجر لا يتزعزع.",
        "lat": 30.0296,
        "lng": 31.2606,
        "character_name": "am-othman",
        "chips": ["لماذا بنيت القلعة؟", "احكيلي عن حربك مع الصليبيين", "ما هو السور؟"],
    },
    {
        "key": "hanging-church",
        "governorate": "cairo",
        "monument_name": "الكنيسة المعلقة — التقليد القبطي",
        "display_name": "الكنيسة المعلقة",
        "builder": "التقليد القبطي",
        "title": "تراث روحي عريق",
        "bio": "لسنا معلقين في الهواء. نحن معلقون بين الزمن والأبدية.",
        "lat": 30.0051,
        "lng": 31.2314,
        "character_name": "am-othman",
        "chips": ["لماذا سُميت بالمعلقة؟", "احكيلي عن العائلة المقدسة في مصر", "ما تاريخ الفسطاط؟"],
    },
    # ── Alexandria ──────────────────────────────────────────────────────
    {
        "key": "qaitbay",
        "governorate": "alexandria",
        "monument_name": "قلعة قايتباي / موقع فنار الإسكندرية — السلطان قايتباي / حارس البحر",
        "display_name": "قلعة قايتباي",
        "builder": "السلطان قايتباي",
        "title": "حارس البحر المتوسط",
        "bio": "بنيت فوق حجارة الفنار القديم. لم أمحُه، بل أعطيته حياة جديدة تواجه البحر.",
        "lat": 31.2140,
        "lng": 29.8856,
        "character_name": "am-othman",
        "chips": ["هل بنيت فوق فنار الإسكندرية؟", "احكيلي عن عجائب الدنيا السبع", "ما علاقة المماليك بالبحر؟"],
    },
    {
        "key": "pompeys-pillar",
        "governorate": "alexandria",
        "monument_name": "عمود السواري / عمود دقلديانوس — كاتب سكندري روماني",
        "display_name": "عمود السواري",
        "builder": "كاتب سكندري روماني",
        "title": "شاهد الإسكندرية",
        "bio": "سموه عمود بومبي وبومبي لم يطأه. التاريخ مليء بأسماء علقت على أشياء لا تعرفها.",
        "lat": 31.1956,
        "lng": 29.9042,
        "character_name": "am-othman",
        "chips": ["لماذا سُمي عمود بومبي؟", "ما هو السيرابيوم؟", "كم ارتفاع العمود؟"],
    },
    {
        "key": "ancient-library",
        "governorate": "alexandria",
        "monument_name": "مكتبة الإسكندرية القديمة — بطليموس الثاني / أمين مكتبة سكندري",
        "display_name": "مكتبة الإسكندرية القديمة",
        "builder": "أمين مكتبة سكندري",
        "title": "كنز المعرفة الضائع",
        "bio": "لو كان الأمر نارًا واحدة، لكانت الحكاية أسهل. لكن فقدان المعرفة لا يحدث دائمًا بصوت عالٍ.",
        "lat": 31.2089,
        "lng": 29.9092,
        "character_name": "am-othman",
        "chips": ["كيف ضاعت المكتبة؟", "من هو إراتوستينس؟", "كم لفافة كانت في المكتبة؟"],
    },
]

# ─── Lookup helpers ─────────────────────────────────────────────────────────

_MONUMENTS_BY_KEY: dict[str, dict] = {m["key"]: m for m in MONUMENTS}
_MONUMENTS_BY_RAG_NAME: dict[str, dict] = {
    m["monument_name"]: m for m in MONUMENTS
}


def get_all_governorates() -> list[dict]:
    """Return all governorates with their monuments nested."""
    result = []
    for gov in GOVERNORATES:
        monuments = [
            {k: v for k, v in m.items() if k != "governorate"}
            for m in MONUMENTS
            if m["governorate"] == gov["key"]
        ]
        gov_copy = dict(gov)
        gov_copy["monuments"] = monuments
        result.append(gov_copy)
    return result


def get_monument_by_key(key: str) -> dict | None:
    return _MONUMENTS_BY_KEY.get(key)


def get_monument_by_rag_name(rag_name: str) -> dict | None:
    """Look up a monument by its exact RAG chunk name."""
    return _MONUMENTS_BY_RAG_NAME.get(rag_name)


def get_monuments_for_governorate(governorate_key: str) -> list[dict]:
    """Return all monuments in a governorate."""
    return [m for m in MONUMENTS if m["governorate"] == governorate_key]

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


DEFAULT_TREE_DATA = {
    "id": "root",
    "members": [
        { 
            "id": "gm", "role": "جدة", "name": "فاطمة", "avatar": "/avatars/gm.png", "status": "preserved", "memories": 847, "occasions": ["عيد ميلاد — 15 مارس"],
            "hasParents": False 
        },
        { 
            "id": "gf", "role": "جد", "name": "محمود", "avatar": "/avatars/gf.png", "status": "preserved", "memories": 1203, "occasions": ["ذكرى زواج — 8 يناير"],
            "hasParents": False
        }
    ],
    "children": [
        {
            "id": "branch_add_uncle",
            "members": [{"id": "add_u", "role": "عم / عمة", "isAddNode": True}]
        },
        {
            "id": "branch_parents",
            "members": [
                {"id": "f", "role": "أب", "name": "أحمد", "avatar": "/avatars/f.png", "status": "preserved", "memories": 24, "occasions": []},
                {"id": "m", "role": "أم", "name": "سعاد", "avatar": "/avatars/m.png", "status": "preserved", "memories": 12, "occasions": []}
            ],
            "children": [
                {"id": "bro", "members": [{"id": "add_b", "role": "أخ / أخت", "isAddNode": True}]},
                { 
                    "id": "me_branch", 
                    "members": [
                        {"id": "me", "role": "أنا", "name": "حسين", "avatar": "/avatars/me.png", "status": "preserved", "isMe": True, "memories": 5, "occasions": []},
                        {"id": "add_wife", "role": "زوج / زوجة", "isAddNode": True}
                    ],
                    "children": [
                        {"id": "dau", "members": [{"id": "add_c", "role": "ابن / ابنة", "isAddNode": True}]}
                    ]
                },
                {"id": "sis", "members": [{"id": "add_s", "role": "أخ / أخت", "isAddNode": True}]}
            ]
        },
        {
            "id": "branch_add_aunt",
            "members": [{"id": "add_a", "role": "خال / خالة", "isAddNode": True}]
        }
    ]
}
