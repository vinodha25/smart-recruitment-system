from datetime import datetime, timedelta
import uuid
from sqlalchemy.orm import Session
from .. import models

def auto_schedule_interview(db: Session, candidate_id: int, duration_minutes: int = 60) -> models.Interview:
    """Automatically schedule an interview 2 days from now at a reasonable hour."""
    scheduled_at = datetime.utcnow() + timedelta(days=2)
    
    # Round to nearest hour for simplicity
    scheduled_at = scheduled_at.replace(minute=0, second=0, microsecond=0)
    
    # Keep it within working hours (9 AM to 4 PM UTC)
    if scheduled_at.hour < 9:
        scheduled_at = scheduled_at.replace(hour=10)
    elif scheduled_at.hour > 16:
        scheduled_at = scheduled_at.replace(hour=14)
        
    # Generate mock meeting link
    meet_link = f"https://meet.mockcompany.com/{str(uuid.uuid4())[:8]}"
    
    interview = models.Interview(
        candidate_id=candidate_id,
        interview_type="video",
        scheduled_at=scheduled_at,
        duration_minutes=duration_minutes,
        location=meet_link,
        status=models.InterviewStatus.SCHEDULED
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    
    return interview
