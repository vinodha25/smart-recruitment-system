"""Final Hiring Decision API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
from ..services import get_current_user, require_hr, gemini_service, email_service, scheduling_service

router = APIRouter(prefix="/api/decisions", tags=["Hiring Decisions"])


@router.get("", response_model=List[schemas.HiringDecisionResponse])
async def list_decisions(
    job_id: Optional[int] = None,
    decision: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all hiring decisions."""
    query = db.query(models.HiringDecision)
    
    if decision:
        query = query.filter(models.HiringDecision.decision == decision)
    
    if job_id:
        query = query.join(models.Candidate).filter(models.Candidate.job_id == job_id)
    
    decisions = query.order_by(models.HiringDecision.decided_at.desc()).all()
    return decisions


@router.get("/{decision_id}", response_model=schemas.HiringDecisionResponse)
async def get_decision(decision_id: int, db: Session = Depends(get_db)):
    """Get a specific hiring decision."""
    decision = db.query(models.HiringDecision).filter(
        models.HiringDecision.id == decision_id
    ).first()
    
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    return decision


@router.get("/candidate/{candidate_id}", response_model=schemas.HiringDecisionResponse)
async def get_candidate_decision(candidate_id: int, db: Session = Depends(get_db)):
    """Get the hiring decision for a specific candidate."""
    decision = db.query(models.HiringDecision).filter(
        models.HiringDecision.candidate_id == candidate_id
    ).first()
    
    if not decision:
        raise HTTPException(status_code=404, detail="No decision found for this candidate")
    
    return decision


@router.post("", response_model=schemas.HiringDecisionResponse)
async def make_decision(
    decision_data: schemas.HiringDecisionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_hr)
):
    """
    Make a final hiring decision.
    
    This is where HR accepts or rejects a candidate.
    AI and system provide support, but HR makes the final call.
    """
    # Check if candidate exists
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == decision_data.candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Check if decision already exists
    existing = db.query(models.HiringDecision).filter(
        models.HiringDecision.candidate_id == decision_data.candidate_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Decision already exists for this candidate. Use update endpoint."
        )
    
    # Check if HR is overriding AI recommendation
    hr_override = False
    if candidate.ai_recommendation:
        ai_rec = candidate.ai_recommendation.lower()
        decision_val = decision_data.decision.lower()
        
        # Determine if this is an override
        if ai_rec == "recommended" and decision_val == "reject":
            hr_override = True
        elif ai_rec == "not_recommended" and decision_val == "accept":
            hr_override = True
    
    # Create decision record
    db_decision = models.HiringDecision(
        candidate_id=decision_data.candidate_id,
        decision=decision_data.decision,
        reason=decision_data.reason,
        ai_recommendation=candidate.ai_recommendation,
        ai_explanation=candidate.ai_insight,
        system_score=candidate.overall_score,
        hr_override=hr_override,
        override_reason=decision_data.override_reason if hr_override else None,
        decided_by=current_user.id
    )
    
    db.add(db_decision)
    
    # Update candidate status
    if decision_data.decision.lower() == "accept":
        candidate.status = models.CandidateStatus.HIRED
        await email_service.send_selection_email(
            candidate_email=candidate.email,
            candidate_name=f"{candidate.first_name} {candidate.last_name}",
            job_title=candidate.job.title if candidate.job else "Position"
        )
    elif decision_data.decision.lower() == "reject":
        candidate.status = models.CandidateStatus.REJECTED
        
        job_data = {
            "title": candidate.job.title if candidate.job else "Position",
            "required_skills": candidate.job.required_skills if candidate.job and candidate.job.required_skills else []
        }
        candidate_data_dict = {
            "first_name": candidate.first_name,
            "last_name": candidate.last_name,
            "extracted_skills": candidate.extracted_skills or []
        }
        
        learning_path_result = await gemini_service.generate_learning_path(
            candidate_data_dict, job_data, status="rejected"
        )
        
        weak_areas = learning_path_result.get("weak_areas", [])
        if not weak_areas and "learning_paths" in learning_path_result:
            # Format from older/fallback version
            weak_areas = [{"skill": p.get("skill"), "courses": p.get("courses")} for p in learning_path_result.get("learning_paths", [])]
        else:
            # Format from AI version - convert youtube_course_search to actual courses
            formatted_weak_areas = []
            for area in weak_areas:
                search_query = area.get("youtube_course_search", area.get("skill", "Learning Resources"))
                formatted_weak_areas.append({
                    "skill": area.get("skill", "Required Skill"),
                    "reason": area.get("reason", ""),
                    "courses": [
                        {
                            "title": f"Search for: {search_query}",
                            "url": f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}"
                        }
                    ]
                })
            weak_areas = formatted_weak_areas
            
        missing_skills = [item.get("skill", "Required Skills") for item in weak_areas]
        
        await email_service.send_rejection_email_with_feedback(
            candidate_email=candidate.email,
            candidate_name=f"{candidate.first_name} {candidate.last_name}",
            job_title=candidate.job.title if candidate.job else "Position",
            missing_skills=missing_skills,
            learning_path_content=weak_areas
        )
    else:
        candidate.status = models.CandidateStatus.SHORTLISTED  # hold
        interview = scheduling_service.auto_schedule_interview(db, candidate.id)
        await email_service.send_interview_invitation(
            candidate_email=candidate.email,
            candidate_name=f"{candidate.first_name} {candidate.last_name}",
            job_title=candidate.job.title if candidate.job else "Position",
            scheduled_date=interview.scheduled_at,
            meet_link=interview.location
        )
    
    db.commit()
    db.refresh(db_decision)
    
    return db_decision


@router.put("/{decision_id}", response_model=schemas.HiringDecisionResponse)
async def update_decision(
    decision_id: int,
    decision_data: schemas.HiringDecisionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_hr)
):
    """Update an existing hiring decision."""
    db_decision = db.query(models.HiringDecision).filter(
        models.HiringDecision.id == decision_id
    ).first()
    
    if not db_decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == db_decision.candidate_id
    ).first()
    
    # Update decision
    db_decision.decision = decision_data.decision
    db_decision.reason = decision_data.reason
    db_decision.override_reason = decision_data.override_reason
    
    # Check override status
    if candidate and candidate.ai_recommendation:
        ai_rec = candidate.ai_recommendation.lower()
        decision_val = decision_data.decision.lower()
        
        if ai_rec == "recommended" and decision_val == "reject":
            db_decision.hr_override = True
        elif ai_rec == "not_recommended" and decision_val == "accept":
            db_decision.hr_override = True
        else:
            db_decision.hr_override = False
    
    # Update candidate status
    if candidate:
        if decision_data.decision.lower() == "accept":
            candidate.status = models.CandidateStatus.HIRED
            await email_service.send_selection_email(
                candidate_email=candidate.email,
                candidate_name=f"{candidate.first_name} {candidate.last_name}",
                job_title=candidate.job.title if candidate.job else "Position"
            )
        elif decision_data.decision.lower() == "reject":
            candidate.status = models.CandidateStatus.REJECTED
            
            job_data = {
                "title": candidate.job.title if candidate.job else "Position",
                "required_skills": candidate.job.required_skills if candidate.job and candidate.job.required_skills else []
            }
            candidate_data_dict = {
                "first_name": candidate.first_name,
                "last_name": candidate.last_name,
                "extracted_skills": candidate.extracted_skills or []
            }
            
            learning_path_result = await gemini_service.generate_learning_path(
                candidate_data_dict, job_data, status="rejected"
            )
            
            job = candidate.job # Get the job object for required skills and title
            
            # 2. Get missing skills using enhanced NLP (TF-IDF)
            from ..services.nlp_service import nlp_service
            missing_skills = nlp_service.calculate_skill_gap(
                resume_text=candidate.resume_text or "",
                required_skills=job.required_skills or []
            )
            
            # 3. Generate rich feedback (YouTube links) using Gemini service
            # We still use Gemini for finding relevant courses for the missing skills
            learning_path_content = []
            if missing_skills:
                # Transform missing skills into the format expected by the template
                for skill in missing_skills:
                    learning_path_content.append({
                        "skill": skill,
                        "courses": [
                            {
                                "title": f"Mastering {skill}",
                                "url": f"https://www.youtube.com/results?search_query={skill.replace(' ', '+')}+tutorial+for+beginners"
                            }
                        ]
                    })
            
            # 4. Trigger Rejection Email
            import asyncio
            asyncio.create_task(
                email_service.send_rejection_email_with_feedback(
                    candidate_email=candidate.email,
                    candidate_name=f"{candidate.first_name} {candidate.last_name}",
                    job_title=job.title,
                    missing_skills=missing_skills,
                    learning_path_content=learning_path_content
                )
            )
        else:
            candidate.status = models.CandidateStatus.SHORTLISTED
            
            existing_interview = db.query(models.Interview).filter(
                models.Interview.candidate_id == candidate.id,
                models.Interview.status == models.InterviewStatus.SCHEDULED
            ).first()
            
            if not existing_interview:
                interview = scheduling_service.auto_schedule_interview(db, candidate.id)
                await email_service.send_interview_invitation(
                    candidate_email=candidate.email,
                    candidate_name=f"{candidate.first_name} {candidate.last_name}",
                    job_title=candidate.job.title if candidate.job else "Position",
                    scheduled_date=interview.scheduled_at,
                    meet_link=interview.location
                )
    
    db.commit()
    db.refresh(db_decision)
    
    return db_decision


@router.get("/stats/summary")
async def get_decision_stats(
    job_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get hiring decision statistics."""
    query = db.query(models.HiringDecision)
    
    if job_id:
        query = query.join(models.Candidate).filter(models.Candidate.job_id == job_id)
    
    total = query.count()
    accepted = query.filter(models.HiringDecision.decision == "accept").count()
    rejected = query.filter(models.HiringDecision.decision == "reject").count()
    on_hold = query.filter(models.HiringDecision.decision == "hold").count()
    overrides = query.filter(models.HiringDecision.hr_override == True).count()
    
    return {
        "total_decisions": total,
        "accepted": accepted,
        "rejected": rejected,
        "on_hold": on_hold,
        "hr_overrides": overrides,
        "acceptance_rate": round((accepted / total * 100) if total > 0 else 0, 1)
    }
