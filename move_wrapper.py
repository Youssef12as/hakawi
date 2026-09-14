import re

with open("frontend/src/pages/map/MonumentChat.jsx", "r", encoding="utf-8") as f:
    text = f.read()

# Remove the Wrapper definitions from their current location
text = re.sub(r"\s*const Wrapper = isOverlay \? 'div' : PageShell;\s*", "", text)
text = re.sub(r"\s*const wrapperProps = isOverlay \? \{ className: 'w-full h-full bg-\[\#111010\]' \} : \{ className: 'bg-espresso/5' \};\s*", "", text)
text = re.sub(r"\s*const innerClass = isOverlay \s*\? 'h-full grid lg:grid-cols-\[1\.15fr_0\.85fr\] animate-slide-in-end overflow-hidden'\s*: 'h-\[calc\(100vh-4rem\)\] grid lg:grid-cols-\[1\.15fr_0\.85fr\] animate-slide-in-end overflow-hidden';\s*", "", text)

# Add them right after the component opening
wrapper_defs = """
  const Wrapper = isOverlay ? 'div' : PageShell;
  const wrapperProps = isOverlay ? { className: 'w-full h-full bg-[#111010]' } : { className: 'bg-espresso/5' };
  const innerClass = isOverlay 
    ? 'h-full grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden'
    : 'h-[calc(100vh-4rem)] grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden';
"""

text = text.replace(
    "export default function MonumentChat({ overrideSlug, initialContext, isOverlay }) {\n",
    "export default function MonumentChat({ overrideSlug, initialContext, isOverlay }) {\n" + wrapper_defs
)

with open("frontend/src/pages/map/MonumentChat.jsx", "w", encoding="utf-8") as f:
    f.write(text)
print("Moved Wrapper definitions to top of component.")
