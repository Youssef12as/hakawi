from google import genai
import json
import time

GEMINI_KEY = "AQ.Ab8RN6L-wT68AMdPXV6lTrEXE-VLMnh7_y01n8arytZa9JfSjw"
CHUNKS_FILE = "chunks.json"
OUTPUT_FILE = "embeddings.json"

client = genai.Client(api_key=GEMINI_KEY)

with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
    chunks = json.load(f)

# Filter: only real chunks (more than 1)
good_chunks = [c for c in chunks if len(c["text"]) >= 150 and c["monument"].count("—") <= 2]
print(f"✅ Embedding {len(good_chunks)} chunks...")

results = []
skipped = 0

for i, chunk in enumerate(good_chunks):
    try:
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=chunk["text"]
        )
        results.append({
            "id": chunk["id"],
            "monument": chunk["monument"],
            "builder": chunk["builder"],
            "section": chunk["section"],
            "text": chunk["text"],
            "embedding": response.embeddings[0].values
        })
        print(f"  ✅ {i+1}/{len(good_chunks)} — {chunk['monument'][:35]}")
        time.sleep(0.5)  # avoid rate limit

    except Exception as e:
        skipped += 1
        print(f"  ⚠️ Skipped {i}: {e}")

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False)

print(f"\n✅ Done! Saved {len(results)} embeddings — Skipped {skipped}")