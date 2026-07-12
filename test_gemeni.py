from google import genai

client = genai.Client(api_key="AQ.Ab8RN6L-wT68AMdPXV6lTrEXE-VLMnh7_y01n8arytZa9JfSjw")

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="قولي مرحبا بصوت فرعون مصري قديم بالعربية"
)

print(response.text)