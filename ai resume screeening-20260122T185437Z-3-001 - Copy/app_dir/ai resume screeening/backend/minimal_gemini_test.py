
import os
import sys

# minimal test
try:
    import google.generativeai as genai
    print("Import successful")
except ImportError as e:
    print(f"Import failed: {e}")
    sys.exit(1)

# Hardcode key for testing to bypass dotenv issues temporarily
# (Using the key seen in previous steps just for this connectivity check)
key = "AIzaSyDlIw-ybol6Ax7McpE8N2GI9BGJbRrprpo"

print(f"Configuring with key: {key[:10]}...")
genai.configure(api_key=key)

try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    print("Model initialized. Generating content...")
    response = model.generate_content("Reply with 'Connected' if you receive this.")
    print(f"RESPONSE: {response.text}")
except Exception as e:
    print(f"GENERATION FAILED: {e}")
