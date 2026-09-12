import json
with open('frontend/src/components/map/DialectMap.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("giza: 'cairo',", "giza: 'giza',")

with open('frontend/src/components/map/DialectMap.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated frontend mapping for giza.")
