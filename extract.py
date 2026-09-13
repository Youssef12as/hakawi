import sys
import re

with open('backend/src/chat/rag_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

direct = re.search(r'elif response_mode == "direct":.*?mode_instructions = \((.*?)\)\n\s+user_ending =', text, re.DOTALL)
hikaya = re.search(r'if response_mode == "hikaya":.*?mode_instructions = \((.*?)\)\n\s+user_ending =', text, re.DOTALL)
presentation = re.search(r'elif response_mode == "presentation":.*?mode_instructions = \((.*?)\)\n\s+user_ending =', text, re.DOTALL)

with open('prompts_extracted.txt', 'w', encoding='utf-8') as out:
    out.write("=== HIKAYA ===\n" + (hikaya.group(1) if hikaya else "Not found") + "\n\n")
    out.write("=== PRESENTATION ===\n" + (presentation.group(1) if presentation else "Not found") + "\n\n")
    # Actually direct is the default else
    direct_else = re.search(r'else:.*?# === "المباشر".*?mode_instructions = \((.*?)\)\n\s+user_ending =', text, re.DOTALL)
    out.write("=== DIRECT ===\n" + (direct_else.group(1) if direct_else else "Not found") + "\n\n")

