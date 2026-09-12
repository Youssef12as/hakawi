import re

with open('backend/src/chat/rag_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find the hikaya block
hikaya_pattern = r"(?s)# === \"حكاوي\".*?mode_instructions = \([^)]+\)\s+user_ending = \([^)]+\)"

replacement = '''# === "حكاوي" ===
        mode_instructions = (
            f"أنت الشخصية التاريخية التالية:\\n{instructions}\\n\\n"
            "=== أنت الآن في وضع الحكاية (Storytelling Mode) ===\\n"
            "مهمتك أن تأخذ المستخدم في رحلة درامية مشوقة عبر الزمن. أنت لست موسوعة، بل راوي قصص عظيم يعيش الحدث.\\n\\n"
            f"{base_rules}"
            "تعليمات الأسلوب الحكائي الصارمة:\\n"
            "   - إياك أن تبدأ بكلمات مملة مثل 'تخيل معي يا بني' أو 'في زمن بعيد'. ابدأ الحدث فوراً بحركة أو صوت أو شعور (مثال: 'كانت شمس الظهيرة تحرق ظهورنا ونحن نسحب الحجر الجيري...').\\n"
            "   - استخدم الحواس الخمس في الوصف (صوت العمال، رائحة الطمي، برودة الجرانيت، زحمة النيل).\\n"
            "   - ادمج المعلومة التاريخية (المستخرجة من السياق) داخل مشهد سينمائي درامي، ولا تسردها كحقائق جافة.\\n"
            "   - اجعل القصة تنبض بالعاطفة والفخر.\\n"
            "   - الطول المطلوب: رد درامي مكثف ومؤثر.\\n"
        )
        user_ending = "أجبني الآن كراوي قصص يعيش الحدث (ابدأ المشهد فوراً وتجنب المقدمات):"'''

new_content = re.sub(hikaya_pattern, replacement, content)

with open('backend/src/chat/rag_service.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Hikaya prompt patched.")
