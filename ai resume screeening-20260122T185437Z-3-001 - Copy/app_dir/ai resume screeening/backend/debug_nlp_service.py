
import sys
import os

# Add local directory to path so we can import app modules
sys.path.append(os.getcwd())

try:
    print("Testing imports...")
    from app.services import nlp_service
    print("Import successful.")
    
    print(f"NLP Service type: {type(nlp_service)}")
    
    # Create a dummy PDF to test
    dummy_pdf_path = "test_resume.pdf"
    
    # We won't actually create a valid PDF binary here easily without pypdf, 
    # but we can check if the method exists.
    if hasattr(nlp_service, 'extract_text_from_pdf'):
        print("Method extract_text_from_pdf exists.")
    else:
        print("ERROR: Method extract_text_from_pdf MISSING.")
        exit(1)

    print("NLP Service check passed.")

except ImportError as e:
    print(f"Import Error: {e}")
    print("Check requirements: pip install pypdf")
except Exception as e:
    print(f"Runtime Error: {e}")
