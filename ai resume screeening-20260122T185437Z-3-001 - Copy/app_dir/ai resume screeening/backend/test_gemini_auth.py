
import google.generativeai as genai
import os
import sys

# Add current dir to path to find app module
sys.path.append(os.getcwd())

from app.config import settings

print(f"Testing API Key: {settings.GEMINI_API_KEY[:10]}... (Length: {len(settings.GEMINI_API_KEY)})")
genai.configure(api_key=settings.GEMINI_API_KEY)

try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello, can you hear me?")
    print(f"SUCCESS: {response.text}")
except Exception as e:
    print(f"FAILED: {e}")
