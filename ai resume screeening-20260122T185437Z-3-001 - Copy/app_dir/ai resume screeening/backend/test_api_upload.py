
import requests
import os

API_URL = "http://localhost:8000/api/resumes/upload"
FILE_PATH = "dummy_resume.pdf"

# Create a dummy pdf
with open(FILE_PATH, "wb") as f:
    f.write(b"%PDF-1.4 dummy content")

def test_upload(job_id=None):
    print(f"Testing upload with job_id={job_id}...")
    files = {'file': open(FILE_PATH, 'rb')}
    data = {}
    if job_id is not None:
        data['job_id'] = job_id
        
    try:
        response = requests.post(API_URL, files=files, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_upload(job_id=4)
