import re

with open("frontend/src/pages/map/MonumentChat.jsx", "r", encoding="utf-8") as f:
    text = f.read()

match = re.search(r"const handleSendText = useCallback\(.*?\);", text, re.DOTALL)
if match:
    print(match.group(0))
