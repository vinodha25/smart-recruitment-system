"""Job Management API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
from ..services import get_current_user, require_recruiter

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("", response_model=List[schemas.JobResponse])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all jobs with optional filtering."""
    query = db.query(models.Job)
    
    if status:
        query = query.filter(models.Job.status == status)
    if department:
        query = query.filter(models.Job.department == department)
    if search:
        query = query.filter(models.Job.title.ilike(f"%{search}%"))
    
    jobs = query.order_by(models.Job.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add candidate count to each job
    for job in jobs:
        job.candidate_count = db.query(models.Candidate).filter(
            models.Candidate.job_id == job.id
        ).count()
    
    return jobs


@router.get("/{job_id}", response_model=schemas.JobResponse)
async def get_job(job_id: int, db: Session = Depends(get_db)):
    """Get a specific job by ID."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.candidate_count = db.query(models.Candidate).filter(
        models.Candidate.job_id == job.id
    ).count()
    
    return job


@router.post("", response_model=schemas.JobResponse)
async def create_job(
    job: schemas.JobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter)
):
    """Create a new job posting."""
    job_data = job.model_dump(exclude_unset=True)
    job_data.pop('status', None) # Ensure status is not passed twice
    db_job = models.Job(
        **job_data,
        created_by=current_user.id,
        status=models.JobStatus.DRAFT
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    return db_job


@router.put("/{job_id}", response_model=schemas.JobResponse)
async def update_job(
    job_id: int,
    job_update: schemas.JobUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter)
):
    """Update an existing job."""
    db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = job_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_job, field, value)
    
    db.commit()
    db.refresh(db_job)
    
    return db_job


@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter)
):
    """Delete a job posting."""
    db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(db_job)
    db.commit()
    
    return {"message": "Job deleted successfully"}


@router.post("/{job_id}/publish", response_model=schemas.JobResponse)
async def publish_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter)
):
    """Publish a draft job."""
    db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db_job.status = models.JobStatus.ACTIVE
    db.commit()
    db.refresh(db_job)
    
    return db_job


@router.get("/{job_id}/stats")
async def get_job_stats(job_id: int, db: Session = Depends(get_db)):
    """Get statistics for a specific job."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get candidate statistics
    total_candidates = db.query(models.Candidate).filter(
        models.Candidate.job_id == job_id
    ).count()
    
    shortlisted = db.query(models.Candidate).filter(
        models.Candidate.job_id == job_id,
        models.Candidate.status == models.CandidateStatus.SHORTLISTED
    ).count()
    
    interviewed = db.query(models.Candidate).filter(
        models.Candidate.job_id == job_id,
        models.Candidate.status == models.CandidateStatus.INTERVIEW
    ).count()
    
    # Get average scores
    avg_score = db.query(func.avg(models.Candidate.overall_score)).filter(
        models.Candidate.job_id == job_id,
        models.Candidate.overall_score.isnot(None)
    ).scalar() or 0
    
    return {
        "job_id": job_id,
        "total_candidates": total_candidates,
        "shortlisted": shortlisted,
        "interviewed": interviewed,
        "average_score": round(avg_score, 1),
        "recommended": db.query(models.Candidate).filter(
            models.Candidate.job_id == job_id,
            models.Candidate.ai_recommendation == "recommended"
        ).count()
    }
