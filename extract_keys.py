import json
import sys
sys.path.insert(0, 'backend')
from src.chat.historical_prompts import HISTORICAL_PERSONAS

with open('keys.json', 'w', encoding='utf-8') as f:
    json.dump(list(HISTORICAL_PERSONAS.keys()), f, ensure_ascii=False, indent=2)
