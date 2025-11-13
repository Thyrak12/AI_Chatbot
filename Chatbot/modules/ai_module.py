# modules/ai_module.py
import requests
import os

# Example for Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

def get_ai_response(user_input: str):
    headers = {"Content-Type": "application/json"}
    params = {"key": GEMINI_API_KEY}

    data = {
        "contents": [{"parts": [{"text": user_input}]}]
    }

    response = requests.post(GEMINI_ENDPOINT, headers=headers, params=params, json=data)

    if response.status_code == 200:
        result = response.json()
        return result["candidates"][0]["content"]["parts"][0]["text"]
    else:
        return "Sorry, I’m having trouble generating a response right now."
