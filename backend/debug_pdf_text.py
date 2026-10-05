import sys
import os
import pypdf

# Set paths
base_dir = os.path.dirname(os.path.abspath(__file__))
upload_dir = os.path.join(base_dir, "uploads", "resumes")

# Find the specific file
target_file = None
for f in os.listdir(upload_dir):
    if "vivekan" in f.lower() and f.endswith(".pdf"):
        target_file = os.path.join(upload_dir, f)
        break

if not target_file:
    print("File not found.")
    sys.exit(1)

print(f"Analyzing: {target_file}")

try:
    reader = pypdf.PdfReader(target_file)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
            
    print(f"Total Pages: {len(reader.pages)}")
    print(f"Extracted Text Length: {len(text)}")
    print("-" * 30)
    print("First 500 characters:")
    print(text[:500])
    print("-" * 30)
    
    if len(text.strip()) < 50:
        print("DETECTED: Likely Image-based PDF or empty text layer.")
    else:
        print("Text layer detected.")
        
except Exception as e:
    print(f"Error reading PDF: {e}")
