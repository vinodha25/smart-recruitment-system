from app.config import settings
import os
from dotenv import load_dotenv

print(f"Current CWD: {os.getcwd()}")
print(f"Env file exists: {os.path.exists('.env')}")
print(f"Settings API Key: '{settings.GEMINI_API_KEY}'")
print(f"Settings API Key Length: {len(settings.GEMINI_API_KEY)}")

if not settings.GEMINI_API_KEY:
    print("Trying to load .env explicitly...")
    load_dotenv(".env")
    print(f"Loaded explicit API Key: '{os.getenv('GEMINI_API_KEY')}'")
