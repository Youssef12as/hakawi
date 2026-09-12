import json
with open('backend/data/rag/chunks.json', 'r', encoding='utf-8') as f:
    chunks = json.load(f)

for chunk in chunks:
    if chunk['id'] == 'giza_khufu_04' and 'khufu_inside.jpg' not in chunk['text']:
        chunk['text'] += '\n\n![الهرم من الداخل](/images/monuments/khufu_inside.jpg)'
    elif chunk['id'] == 'giza_khufu_03' and 'khufu_inside.jpg' not in chunk['text']:
        chunk['text'] += '\n\n![الهرم من الداخل](/images/monuments/khufu_inside.jpg)'

with open('backend/data/rag/chunks.json', 'w', encoding='utf-8') as f:
    json.dump(chunks, f, ensure_ascii=False, indent=2)
print("Updated chunks with missing images.")
