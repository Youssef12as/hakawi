import json
with open('backend/src/chat/historical_prompts.py', 'r', encoding='utf-8') as f:
    text = f.read()
print(text[:1000])
