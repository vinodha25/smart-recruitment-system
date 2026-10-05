
import requests
import json
import os

API_KEY = "AIzaSyDlIw-ybol6Ax7McpE8N2GI9BGJbRrprpo"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}"

headers = {
    "Content-Type": "application/json"
}

data = {
    "contents": [{
        "parts": [{"text": "Hello, can you hear me? Reply with 'Connected via HTTP'"}]
    }]
}

print(f"Sending request to {URL[:50]}...")

try:
    response = requests.post(URL, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response:", response.json())
    else:
        print("Error:", response.text)
except Exception as e:
    print(f"HTTP Request Failed: {e}")
