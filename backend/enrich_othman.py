"""
Add Aswan regional chunks for Am Othman with local images.
These chunks have monument = "أسوان — أرض الذهب" to match the registry.
"""
import os, json, time
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "rag")
EMBEDDINGS_FILE = os.path.join(DATA_DIR, "embeddings.json")
CHUNKS_FILE = os.path.join(DATA_DIR, "chunks.json")

OTHMAN_CHUNKS = [
    {
        "id": "othman_nubia_01",
        "monument": "أسوان — أرض الذهب",
        "builder": "عم عثمان",
        "section": "nubian_life",
        "text": (
            "أسوان — أرض الذهب\n\n"
            "النوبة وأهلها\n"
            "النوبة يا ولدي هي روح أسوان وأهلها رمز للطيبة والسكينة. "
            "إحنا سيبنا بيوتنا القديمة لما اتبنى السد العالي، بس أخدنا النوبة جوة قلوبنا في كل حتة رحناها. "
            "بيوتنا النوبية تحفة فنية، ملونة بالأزرق والأصفر والبرتقالي، كل لون فيها له معنى ورمز. "
            "الأزرق للنيل والسما، والأصفر للصحرا والدهب، والأخضر للزراعة والحياة. "
            "أهلنا بيستقبلوا الضيوف بابتسامة صافية وكوباية كركديه ساقعة. "
            "العادات النوبية عمرها آلاف السنين: الموسيقى والأغاني والرقص في الأفراح، "
            "والحنة والعطور والبخور في كل مناسبة.\n\n"
            "![بيوت النوبة](/images/monuments/nubian_village.jpg)"
        )
    },
    {
        "id": "othman_nile_01",
        "monument": "أسوان — أرض الذهب",
        "builder": "عم عثمان",
        "section": "nile_felucca",
        "text": (
            "أسوان — أرض الذهب\n\n"
            "النيل والفلوكة في أسوان\n"
            "النيل في أسوان غير أي حتة تانية في مصر. المية هنا صافية زي الكريستال، "
            "والصخور الجرانيتية بتتلألأ وسط المية. الفلوكة هي المركب الشراعي اللي بنتنقل بيها من أيام أجدادنا. "
            "ركوب الفلوكة وقت الغروب من أحلى اللحظات اللي هتعيشها في حياتك. "
            "الشراع الأبيض بيتملى بالهوا، والمية بتعكس لون السما البرتقاني، "
            "وبتسمع صوت المية وهي بتلطش في المركب. منظر يغسل الهموم ويريح القلب. "
            "من على الفلوكة بتشوف جزيرة الفنتين ومعبد فيلة والقرى النوبية الملونة على الضفة التانية.\n\n"
            "![الفلوكة في نيل أسوان](/images/monuments/aswan_nile.jpg)"
        )
    },
    {
        "id": "othman_food_01",
        "monument": "أسوان — أرض الذهب",
        "builder": "عم عثمان",
        "section": "nubian_food",
        "text": (
            "أسوان — أرض الذهب\n\n"
            "الأكل النوبي في أسوان\n"
            "الأكل النوبي حاجة تانية خالص يا ولدي. عندنا أكلات مش هتلاقيها في أي حتة تانية في مصر. "
            "الويكة دي ملوخية ناشفة بتتطبخ بطريقة نوبية خاصة مع اللحمة أو الفراخ، طعمها ملوش مثيل. "
            "والكمونية دي كرشة بتتطبخ بالكمون والتوابل النوبية الخاصة. "
            "والدقة النوبية دي خلطة بهارات بنعملها بإيدينا من الفلفل الحار والكمون والكزبرة. "
            "والكركديه ده المشروب الرسمي بتاع أسوان، بارد في الصيف ودافي في الشتا، "
            "أحلى من أي عصير في الدنيا. تعال جرب وهتعرف إن أسوان مش بس آثار، دي أكل وطعم ومزاج تاني."
        )
    },
]

def main():
    print("Loading existing embeddings...")
    with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
        existing = json.load(f)

    remove_ids = {c["id"] for c in OTHMAN_CHUNKS}
    existing = [c for c in existing if c.get("id") not in remove_ids]

    total = len(OTHMAN_CHUNKS)
    print(f"Embedding {total} Am Othman chunks...")
    for i, chunk in enumerate(OTHMAN_CHUNKS):
        print(f"  [{i+1}/{total}] {chunk['id']}...")
        res = genai.embed_content(
            model="models/gemini-embedding-001",
            content=chunk["text"],
            task_type="retrieval_document"
        )
        ec = chunk.copy()
        ec["embedding"] = res["embedding"]
        existing.append(ec)
        time.sleep(3)

    print("Saving embeddings.json...")
    with open(EMBEDDINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    print("Saving chunks.json...")
    chunks_only = [{k:v for k,v in c.items() if k != "embedding"} for c in existing]
    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks_only, f, ensure_ascii=False, indent=2)

    print("Done! Am Othman now has his own chunks with images!")

if __name__ == "__main__":
    main()
