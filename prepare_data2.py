import json
import re

INPUT_FILE = "monuments_data.txt"
OUTPUT_FILE = "chunks.json"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    text = f.read()

# Split on Research Dossier
parts = re.split(r"Research Dossier \d+", text)
parts = [p.strip() for p in parts if p.strip()]

print(f"Total parts: {len(parts)}")

# Merge duplicate parts (each monument appears twice: AR + EN)
# Take every other part starting from 0
monuments = []
for p in parts:
    if len(p) > 100:
        monuments.append(p)

print(f"Valid monuments: {len(monuments)}")

all_chunks = []

for idx, dossier in enumerate(monuments):
    lines = [l.strip() for l in dossier.split("\n") if l.strip()]

    # Get name from first lines
    monument_name = ""
    for line in lines[:5]:
        clean = line.replace("#", "").replace("*", "").strip()
        if clean and len(clean) > 3:
            monument_name = clean
            break

    builder = monument_name.split("—")[-1].strip() if "—" in monument_name else "Unknown"

    # Split into sections
    # Works for both ١. and ## patterns
    section_breaks = []
    for i, line in enumerate(lines):
        # Arabic numbered section
        if re.match(r"^[١٢٣٤٥٦٧٨٩٠]+\.", line):
            section_breaks.append(i)
        # Markdown header with number
        elif re.match(r"^#{1,3}\s*\d+", line):
            section_breaks.append(i)

    if not section_breaks:
        # No sections found — use full text
        full_text = "\n".join(lines[:80])
        if len(full_text) > 150:
            all_chunks.append({
                "id": f"monument_{idx}_full",
                "monument": monument_name,
                "builder": builder,
                "section": "full",
                "text": f"{monument_name}\n\n{full_text}"
            })
        continue

    # Add end marker
    section_breaks.append(len(lines))

    for i in range(len(section_breaks) - 1):
        start = section_breaks[i]
        end = section_breaks[i + 1]
        section_lines = lines[start:end]
        section_text = "\n".join(section_lines)

        if len(section_text) < 100:
            continue

        section_header = lines[start][:60]
        chunk_id = f"m{idx}_s{i+1}"

        all_chunks.append({
            "id": chunk_id,
            "monument": monument_name,
            "builder": builder,
            "section": section_header,
            "text": f"{monument_name}\n\n{section_text[:2000]}"
        })

print(f"\n✅ Total chunks: {len(all_chunks)}")

monuments_summary = {}
for c in all_chunks:
    m = c["monument"][:45]
    monuments_summary[m] = monuments_summary.get(m, 0) + 1

for m, count in sorted(monuments_summary.items()):
    print(f"  {count:3d} — {m}")

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_chunks, f, ensure_ascii=False, indent=2)

print(f"\n✅ Saved to {OUTPUT_FILE}")