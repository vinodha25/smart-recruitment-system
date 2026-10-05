from dotenv import load_dotenv
import os

load_dotenv(".env")
key = os.getenv("GEMINI_API_KEY")
print(f"Key found: {'YES' if key else 'NO'}")
if key:
    print(f"Key starts with: {key[:5]}...")
    print(f"Key length: {len(key)}")
