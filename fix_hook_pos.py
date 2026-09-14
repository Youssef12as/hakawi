import re

with open("frontend/src/pages/map/MonumentChat.jsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove the misplaced useEffect
bad_hook_pattern = r"\s*useEffect\(\(\) => \{\s*if \(initialContext && sessionId && !hasSentInitialContext\) \{\s*handleSendText\(initialContext\);\s*setHasSentInitialContext\(true\);\s*\}\s*\}, \[initialContext, sessionId, hasSentInitialContext, handleSendText\]\);"
text = re.sub(bad_hook_pattern, "", text)

# 2. Insert it before the final return 
# The final return now looks like: return (\n    <Wrapper {...wrapperProps}>\n      <div\n        className={innerClass}
hook = """
  useEffect(() => {
    if (initialContext && sessionId && !hasSentInitialContext) {
      handleSendText(initialContext);
      setHasSentInitialContext(true);
    }
  }, [initialContext, sessionId, hasSentInitialContext, handleSendText]);
"""

text = text.replace("  return (\n    <Wrapper {...wrapperProps}>\n      <div\n        className={innerClass}", hook + "\n  return (\n    <Wrapper {...wrapperProps}>\n      <div\n        className={innerClass}")

with open("frontend/src/pages/map/MonumentChat.jsx", "w", encoding="utf-8") as f:
    f.write(text)
print("Fixed useEffect position.")
