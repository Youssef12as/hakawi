import sys
import re

with open('backend/src/chat/rag_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

# find fallback
fallback = re.search(r'DEFAULT_PERSONA\s*=\s*\{(.*?)\}', text, re.DOTALL)
if fallback:
    print(fallback.group(0)[:500])

