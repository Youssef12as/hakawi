import re

with open("frontend/src/pages/map/MonumentChat.jsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update signature
text = re.sub(
    r"export default function MonumentChat\([^)]*\) \{",
    "export default function MonumentChat({ overrideSlug, initialContext, isOverlay }) {",
    text
)

# 2. Update useParams
text = re.sub(
    r"const \{ govKey, monumentSlug \} = useParams\(\);",
    "const { govKey, monumentSlug: urlSlug } = useParams();\n  const monumentSlug = overrideSlug || urlSlug;",
    text
)

# 3. Add hasSentInitialContext state
if "hasSentInitialContext" not in text:
    text = re.sub(
        r"const \[showWall, setShowWall\] = useState\(false\);",
        "const [showWall, setShowWall] = useState(false);\n  const [hasSentInitialContext, setHasSentInitialContext] = useState(false);",
        text
    )

# 4. Add initialContext useEffect before the main return
if "initialContext && sessionId && !hasSentInitialContext" not in text:
    hook = """
  useEffect(() => {
    if (initialContext && sessionId && !hasSentInitialContext) {
      handleSendText(initialContext);
      setHasSentInitialContext(true);
    }
  }, [initialContext, sessionId, hasSentInitialContext, handleSendText]);
"""
    # Insert before the final return
    text = re.sub(
        r"(return \(\s*<PageShell className=\"bg-espresso/5\">)",
        lambda m: hook + "\n  " + m.group(1),
        text,
        count=1
    )

# 5. Fix the Wrapper logic
if "const Wrapper =" not in text:
    wrapper_logic = """
  const Wrapper = isOverlay ? 'div' : PageShell;
  const wrapperProps = isOverlay ? { className: 'w-full h-full bg-[#111010]' } : { className: 'bg-espresso/5' };
  const innerClass = isOverlay 
    ? 'h-full grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden'
    : 'h-[calc(100vh-4rem)] grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden';
"""
    
    # Insert logic right before the final return
    text = re.sub(
        r"(return \(\s*<PageShell className=\"bg-espresso/5\">)",
        lambda m: wrapper_logic + "\n  " + m.group(1),
        text,
        count=1
    )
    
    # Replace final return PageShell with Wrapper
    text = re.sub(
        r"return \(\s*<PageShell className=\"bg-espresso/5\">\s*<div\s*className=\"h-\[calc\(100vh-4rem\)\] grid lg:grid-cols-\[1\.15fr_0\.85fr\] animate-slide-in-end overflow-hidden\"",
        "return (\n    <Wrapper {...wrapperProps}>\n      <div\n        className={innerClass}",
        text
    )

    # Replace loading PageShell
    text = re.sub(
        r"<PageShell className=\"bg-espresso/5\">\s*<div className=\"h-\[calc\(100vh-4rem\)\] flex items-center justify-center\">",
        "<Wrapper {...wrapperProps}>\n          <div className={isOverlay ? \"h-full flex items-center justify-center\" : \"h-[calc(100vh-4rem)] flex items-center justify-center\"}>",
        text
    )

    # Replace all closing </PageShell> with </Wrapper> (this is safe if we replaced the opening ones)
    text = text.replace("</PageShell>", "</Wrapper>")

with open("frontend/src/pages/map/MonumentChat.jsx", "w", encoding="utf-8") as f:
    f.write(text)
print("MonumentChat.jsx fully patched via python")
