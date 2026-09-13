import json
import base64
with open('backend/src/chat/historical_prompts.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'"([^"]*أسوان[^"]*)":\s*\{(.*?)\},', text, re.DOTALL)
if matches:
    key, val = matches[0]
    out = f'KEY: {key}\nVAL: {val}'
    print(base64.b64encode(out.encode('utf-8')).decode('utf-8'))
