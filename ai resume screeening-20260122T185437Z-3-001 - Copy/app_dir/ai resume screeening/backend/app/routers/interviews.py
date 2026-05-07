"""Interview Management API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from ..database import get_db
from .. import models, schemas
from ..services import get_current_user, email_service

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


@router.get("", response_model=List[schemas.InterviewResponse])
async def list_interviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    candidate_id: Optional[int] = None,
    status: Optional[str] = None,
    upcoming_only: bool = False,
    db: Session = Depends(get_db)
):
    """List all interviews with optional filtering."""
    query = db.query(models.Interview)
    
    if candidate_id:
        query = query.filter(models.Interview.candidate_id == candidate_id)
    if status:
        query = query.filter(models.Interview.status == status)
    if upcoming_only:
        query = query.filter(
            models.Interview.scheduled_at >= datetime.utcnow(),
            models.Interview.status == models.InterviewStatus.SCHEDULED
        )
    
    interviews = query.order_by(models.Interview.scheduled_at.desc()).offset(skip).limit(limit).all()
    return interviews


@router.get("/upcoming")
async def get_upcoming_interviews(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    """Get interviews scheduled in the next N days."""
    end_date = datetime.utcnow() + timedelta(days=days)
    
    interviews = db.query(models.Interview).filter(
        models.Interview.scheduled_at >= datetime.utcnow(),
        models.Interview.scheduled_at <= end_date,
        models.Interview.status == models.InterviewStatus.SCHEDULED
    ).order_by(models.Interview.scheduled_at.asc()).all()
    
    results = []
    for interview in interviews:
        candidate = db.query(models.Candidate).filter(
            models.Candidate.id == interview.candidate_id
        ).first()
        
        results.append({
            "id": interview.id,
            "candidate_id": interview.candidate_id,
            "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "Unknown",
            "interview_type": interview.interview_type,
            "scheduled_at": interview.scheduled_at.isoformat(),
            "duration_minutes": interview.duration_minutes,
            "location": interview.location,
            "status": interview.status.value
        })
    
    return results


@router.get("/{interview_id}", response_model=schemas.InterviewResponse)
async def get_interview(interview_id: int, db: Session = Depends(get_db)):
    """Get a specific interview."""
    interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return interview


@router.post("", response_model=schemas.InterviewResponse)
async def schedule_interview(
    interview: schemas.InterviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Schedule a new interview."""
    # Check if candidate exists
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == interview.candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    db_interview = models.Interview(
        candidate_id=interview.candidate_id,
        interview_type=interview.interview_type,
        scheduled_at=interview.scheduled_at,
        duration_minutes=interview.duration_minutes,
        location=interview.location,
        interviewer_ids=interview.interviewer_ids,
        status=models.InterviewStatus.SCHEDULED
    )
    
    db.add(db_interview)
    
    # Update candidate status
    candidate.status = models.CandidateStatus.INTERVIEW
    
    db.commit()
    db.refresh(db_interview)
    
    # Send interview invitation email asynchronously
    try:
        # Get candidate name for the email
        candidate_name = f"{candidate.first_name} {candidate.last_name}"
        # Trigger email automation
        import asyncio
        asyncio.create_task(
            email_service.send_interview_invitation(
                candidate_email=candidate.email,
                candidate_name=candidate_name,
                job_title=interview.interview_type, 
                scheduled_date=interview.scheduled_at,
                meet_link=interview.location if "http" in interview.location else "https://meet.google.com/new"
            )
        )
    except Exception as e:
        print(f"Failed to trigger interview email: {e}")
    
    return db_interview


@router.put("/{interview_id}", response_model=schemas.InterviewResponse)
async def update_interview(
    interview_id: int,
    interview_update: schemas.InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update an interview."""
    db_interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    update_data = interview_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and value:
            value = models.InterviewStatus(value)
        setattr(db_interview, field, value)
    
    db.commit()
    db.refresh(db_interview)
    
    return db_interview


@router.post("/{interview_id}/complete")
async def complete_interview(
    interview_id: int,
    feedback: str,
    rating: float = Query(..., ge=1, le=5),
    technical_score: Optional[float] = Query(None, ge=0, le=100),
    communication_score: Optional[float] = Query(None, ge=0, le=100),
    cultural_fit_score: Optional[float] = Query(None, ge=0, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark interview as completed with feedback."""
    db_interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    db_interview.status = models.InterviewStatus.COMPLETED
    db_interview.feedback = feedback
    db_interview.rating = rating
    db_interview.technical_score = technical_score
    db_interview.communication_score = communication_score
    db_interview.cultural_fit_score = cultural_fit_score
    
    db.commit()
    
    return {"message": "Interview completed successfully", "interview_id": interview_id}


@router.post("/{interview_id}/cancel")
async def cancel_interview(
    interview_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Cancel an interview."""
    db_interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    db_interview.status = models.InterviewStatus.CANCELLED
    if reason:
        db_interview.feedback = f"Cancelled: {reason}"
    
    db.commit()
    
    return {"message": "Interview cancelled", "interview_id": interview_id}


@router.delete("/{interview_id}")
async def delete_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete an interview."""
    db_interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    db.delete(db_interview)
    db.commit()
    
    return {"message": "Interview deleted successfully"}


@router.get("/stats/summary")
async def get_interview_stats(db: Session = Depends(get_db)):
    """Get interview statistics."""
    now = datetime.utcnow()
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=7)
    
    total = db.query(models.Interview).count()
    
    this_week = db.query(models.Interview).filter(
        models.Interview.scheduled_at >= week_start,
        models.Interview.scheduled_at < week_end
    ).count()
    
    completed = db.query(models.Interview).filter(
        models.Interview.status == models.InterviewStatus.COMPLETED
    ).count()
    
    cancelled = db.query(models.Interview).filter(
        models.Interview.status == models.InterviewStatus.CANCELLED
    ).count()
    
    upcoming = db.query(models.Interview).filter(
        models.Interview.scheduled_at >= now,
        models.Interview.status == models.InterviewStatus.SCHEDULED
    ).count()
    
    return {
        "total_interviews": total,
        "this_week": this_week,
        "completed": completed,
        "cancelled": cancelled,
        "upcoming": upcoming,
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 1)
    }
