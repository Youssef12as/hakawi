import json
import os

paths = []
for root, _, files in os.walk('backend'):
    for file in files:
        if file.endswith('.py') or file.endswith('.json'):
            paths.append(os.path.join(root, file))

for path in paths:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'عثمان' in content or 'amr-abdeen' in content or 'نوبي' in content or 'عمر عابدين' in content:
                print(f"Found in: {path}")
    except:
        pass
