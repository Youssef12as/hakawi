import os

from google import genai

if not os.environ.get("GEMINI_API_KEY"):
    raise SystemExit("GEMINI_API_KEY env var is required")

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="قولي مرحبا بصوت فرعون مصري قديم بالعربية"
)

print(response.text)