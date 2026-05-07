import asyncio
import os
from dotenv import load_dotenv
from app.services.email_service import send_email_async, send_acknowledgment_email

# Load environment variables
load_dotenv()

async def test_email():
    print("Starting email configuration test...")
    print(f"EMAIL_USER: {os.getenv('EMAIL_USER')}")
    print(f"EMAIL_HOST: {os.getenv('EMAIL_HOST')}")
    print(f"EMAIL_PORT: {os.getenv('EMAIL_PORT')}")
    
    # Test acknowledgment email (simplest one)
    test_email_addr = os.getenv('EMAIL_USER')
    if not test_email_addr or "example.com" in test_email_addr or "your-email" in test_email_addr:
        print("ERROR: Please configure a valid EMAIL_USER in your .env file before running this test.")
        return

    print(f"Sending test email to: {test_email_addr}")
    
    try:
        success = await send_acknowledgment_email(
            candidate_email=test_email_addr,
            first_name="Test User",
            job_title="Software Engineer (Test)"
        )
        
        if success:
            print("\nSUCCESS: Email sent successfully! Check your inbox (and spam folder).")
            print("Note: If you are using Gmail, make sure you have generated and used an 'App Password'.")
        else:
            print("\nFAILED: Email sending failed. The email service returned False.")
            print("Check if your EMAIL_USER and EMAIL_FROM match and are correct.")
    except Exception as e:
        print(f"\nCRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\nCommon fixes for Gmail:")
        print("1. Use a 16-character 'App Password' from Google Account settings.")
        print("2. Ensure and '2-Step Verification' is ON.")
        print("3. Check that your EMAIL_USER is the full gmail address.")

if __name__ == "__main__":
    # Ensure we are in the backend directory
    # Set up Python path if needed
    import sys
    sys.path.append(os.getcwd())
    
    asyncio.run(test_email())
