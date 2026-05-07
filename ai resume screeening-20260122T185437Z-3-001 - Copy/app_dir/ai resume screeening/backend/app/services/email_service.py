import logging
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logger
logger = logging.getLogger("email_service")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('\n[EMAIL SERVICE] %(message)s\n'))
    logger.addHandler(handler)

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("EMAIL_USER"),
    MAIL_PASSWORD=os.getenv("EMAIL_PASSWORD"),
    MAIL_FROM=os.getenv("EMAIL_FROM"),
    MAIL_PORT=int(os.getenv("EMAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("EMAIL_HOST"),
    MAIL_FROM_NAME=os.getenv("EMAIL_FROM_NAME", "Smart Recruitment Team"),
    MAIL_STARTTLS=os.getenv("EMAIL_STARTTLS", "True") == "True",
    MAIL_SSL_TLS=os.getenv("EMAIL_SSL_TLS", "False") == "True",
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=Path(__file__).parent.parent / 'templates' / 'email'
)

fastmail = FastMail(conf)

async def send_email_async(
    subject: str,
    recipients: List[EmailStr],
    template_name: str,
    template_body: Dict[str, Any]
):
    """Base method to send emails asynchronously using HTML templates."""
    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        template_body=template_body,
        subtype=MessageType.html
    )
    
    try:
        await fastmail.send_message(message, template_name=template_name)
        logger.info(f"Email sent successfully to {recipients} | Subject: {subject}")
        _log_to_file(recipients[0], subject, "HTML Template: " + template_name)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipients}: {str(e)}")
        return False

async def send_acknowledgment_email(candidate_email: str, first_name: str, job_title: str):
    """Send an acknowledgment email when a resume is uploaded."""
    return await send_email_async(
        subject=f"Application Received: {job_title}",
        recipients=[candidate_email],
        template_name="acknowledgment.html",
        template_body={"first_name": first_name, "job_title": job_title}
    )

async def send_selection_email(candidate_email: str, candidate_name: str, job_title: str):
    """Send a selection/offer email to the candidate."""
    # Split name for the template
    first_name = candidate_name.split()[0] if candidate_name else "Candidate"
    return await send_email_async(
        subject=f"Congratulations! You've been selected for {job_title}",
        recipients=[candidate_email],
        template_name="selection.html",
        template_body={"first_name": first_name, "job_title": job_title}
    )

async def send_interview_invitation(
    candidate_email: str, 
    candidate_name: str, 
    job_title: str, 
    scheduled_date: datetime, 
    meet_link: str
):
    """Send an interview invitation."""
    first_name = candidate_name.split()[0] if candidate_name else "Candidate"
    date_formatted = scheduled_date.strftime("%B %d, %Y at %I:%M %p")
    
    return await send_email_async(
        subject=f"Interview Invitation: {job_title}",
        recipients=[candidate_email],
        template_name="interview_invitation.html",
        template_body={
            "first_name": first_name,
            "job_title": job_title,
            "scheduled_date": date_formatted,
            "meet_link": meet_link
        }
    )

async def send_rejection_email_with_feedback(
    candidate_email: str, 
    candidate_name: str, 
    job_title: str, 
    missing_skills: List[str], 
    learning_path_content: List[Dict[str, Any]]
):
    """Send a rejection email with AI-generated learning suggestions."""
    first_name = candidate_name.split()[0] if candidate_name else "Candidate"
    
    return await send_email_async(
        subject=f"Update on your application for {job_title}",
        recipients=[candidate_email],
        template_name="rejection.html",
        template_body={
            "first_name": first_name,
            "job_title": job_title,
            "learning_resources": learning_path_content
        }
    )

def _log_to_file(to_email: str, subject: str, body: str):
    """Utility to append email summaries to a local file for verification."""
    try:
        with open("emails.log", "a") as f:
            f.write(f"{'='*50}\n")
            f.write(f"DATE: {datetime.now().isoformat()}\n")
            f.write(f"TO: {to_email}\n")
            f.write(f"SUBJECT: {subject}\n")
            f.write(f"ACTION: {body}\n")
            f.write(f"{'='*50}\n\n")
    except Exception as e:
        logger.error(f"Failed to log email to file: {e}")