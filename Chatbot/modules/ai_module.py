import os
from dotenv import load_dotenv
from google import genai

load_dotenv()  # must be at the very top

def ask_ai(prompt):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return "AI Error: GEMINI_API_KEY missing in environment variables."

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"AI ERROR: {str(e)}"
