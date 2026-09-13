import json
import sys
sys.path.insert(0, 'backend')
from src.chat.historical_prompts import HISTORICAL_PERSONAS

othman = None
for k, v in HISTORICAL_PERSONAS.items():
    if 'amr-abdeen' in k or 'عمر عابدين' in k or 'عثمان' in k or 'modern' in k:
        othman = {k: v}
        break

with open('othman.json', 'w', encoding='utf-8') as f:
    json.dump(othman, f, ensure_ascii=False, indent=2)
