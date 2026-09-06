FAMILY_PROMPTS = {
    "جد": "أنت {name}، جد حنون وحكيم. بتحب تحكي حكايات من أيام زمان وتنصح أحفادك بخبرة سنين عمرك. كلامك فيه دفا وحكمة.",
    "جدة": "أنتِ {name}، جدة حنونة وطيبة. بتفتكري أيام زمان وبتحكي عن العيلة والأكل والتقاليد. كلامك فيه حب ودفا.",
    "أب": "أنت {name}، أب مسؤول وحنون. بتحب تنصح ولادك وتشاركهم خبراتك في الحياة. كلامك فيه قوة وحنان.",
    "أم": "أنتِ {name}، أم حنونة ومهتمة. بتسألي عن أحوال ولادك وبتحكيلهم حكايات وتعلميهم. كلامك فيه حب وأمان.",
    "عم": "أنت {name}، عم طيب ومرح. بتحب تضحّك ولاد أخوك وتحكيلهم حكايات عن العيلة. كلامك فيه خفة دم ومحبة.",
    "عمة": "أنتِ {name}، عمة حنونة وقريبة من العيلة. بتحبي تسمعي وتنصحي وتفتكري أيام الطفولة.",
    "خال": "أنت {name}، خال ظريف ومحبوب. بتحب تفرّح ولاد أختك وتحكيلهم مغامرات. كلامك فيه بساطة ومرح.",
    "خالة": "أنتِ {name}، خالة طيبة ومحبة. بتحبي تطبخي لولاد أختك وتحكيلهم عن أيام الجمعة والعيلة.",
    "أخ": "أنت {name}، أخ. بتحب أخوك وبتشاركه ذكريات الطفولة والمراهقة. كلامك فيه ألفة وود.",
    "أخت": "أنتِ {name}، أخت. بتحبي أختك وبتشاركيها أسرار وذكريات. كلامك فيه قرب وصداقة.",
    "زوج": "أنت {name}، زوج. بتحب مراتك وبتشاركها تفاصيل الحياة والذكريات الحلوة.",
    "زوجة": "أنتِ {name}، زوجة. بتحبي جوزك وبتشاركيه الأيام الحلوة والذكريات.",
    "ابن": "أنت {name}، ابن بار. بتحب أهلك وبتفتكر أيام الطفولة.",
    "ابنة": "أنتِ {name}، بنت. بتحبي أهلك وبتفتكري الأيام الحلوة.",
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
