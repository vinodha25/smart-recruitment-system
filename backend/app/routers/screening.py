"""Resume Screening API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
from ..services import get_current_user, nlp_service, gemini_service
from ..services.email_service import send_selection_email, send_rejection_email_with_feedback
import asyncio

router = APIRouter(prefix="/api/screening", tags=["Screening"])


@router.get("/results")
async def get_screening_results(
    job_id: Optional[int] = None,
    recommendation: Optional[str] = None,
    min_score: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Get all screening results with filtering."""
    query = db.query(models.Candidate).options(joinedload(models.Candidate.job)).filter(
        models.Candidate.overall_score.isnot(None)
    )
    
    if job_id:
        query = query.filter(models.Candidate.job_id == job_id)
    if recommendation:
        query = query.filter(models.Candidate.ai_recommendation == recommendation)
    if min_score:
        query = query.filter(models.Candidate.overall_score >= min_score)
    
    candidates = query.order_by(models.Candidate.overall_score.desc()).all()
    
    results = []
    for c in candidates:
        results.append({
            "id": c.id,
            "name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "job_id": c.job_id,
            "job_title": c.job.title if c.job else "General Application",
            "overall_score": c.overall_score,
            "skill_match_score": c.skill_match_score,
            "experience_match_score": c.experience_match_score,
            "education_match_score": c.education_match_score,
            "ai_recommendation": c.ai_recommendation,
            "ai_insight": c.ai_insight,
            "status": c.status.value if c.status else "new",
            "extracted_skills": c.extracted_skills or [],
            "applied_at": c.applied_at.isoformat() if c.applied_at else None
        })
    
    return results


@router.get("/stats")
async def get_screening_stats(
    job_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get screening statistics."""
    query = db.query(models.Candidate).filter(
        models.Candidate.overall_score.isnot(None)
    )
    
    if job_id:
        query = query.filter(models.Candidate.job_id == job_id)
    
    total = query.count()
    
    recommended = query.filter(
        models.Candidate.ai_recommendation == "recommended"
    ).count()
    
    review = query.filter(
        models.Candidate.ai_recommendation == "review"
    ).count()
    
    not_recommended = query.filter(
        models.Candidate.ai_recommendation == "not_recommended"
    ).count()
    
    avg_score = db.query(func.avg(models.Candidate.overall_score)).filter(
        models.Candidate.overall_score.isnot(None)
    ).scalar() or 0
    
    return {
        "total_screened": total,
        "recommended": recommended,
        "pending_review": review,
        "not_recommended": not_recommended,
        "average_score": round(avg_score, 1)
    }


@router.post("/batch-screen")
async def batch_screen_candidates(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Screen all unscreened candidates for a job."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get unscreened candidates
    candidates = db.query(models.Candidate).filter(
        models.Candidate.job_id == job_id,
        models.Candidate.overall_score.is_(None)
    ).all()
    
    screened_count = 0
    for candidate in candidates:
        skills = candidate.extracted_skills or []
        
        skill_match = nlp_service.calculate_skill_match_score(
            skills,
            job.required_skills or [],
            job.preferred_skills or []
        )
        
        experience_match = nlp_service.calculate_experience_match_score(
            candidate.experience_years or 0,
            job.min_experience_years or 0
        )
        
        education_match = 75.0
        if candidate.education:
            education_match = 85.0
        
        overall_score = (skill_match * 0.5) + (experience_match * 0.3) + (education_match * 0.2)
        
        if overall_score >= 75:
            recommendation = "recommended"
        elif overall_score >= 50:
            recommendation = "review"
        else:
            recommendation = "not_recommended"
        
        candidate.overall_score = overall_score
        candidate.skill_match_score = skill_match
        candidate.experience_match_score = experience_match
        candidate.education_match_score = education_match
        candidate.ai_recommendation = recommendation
        candidate.status = models.CandidateStatus.SCREENING
        
        screened_count += 1
    
    db.commit()
    
    # --- AUTOMATED EMAIL NOTIFICATION (BATCH) ---
    try:
        # Extract plain data to avoid DetachedInstanceError
        batch_data = []
        for c in candidates:
            batch_data.append({
                "id": c.id,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "ai_recommendation": c.ai_recommendation,
                "extracted_skills": c.extracted_skills or []
            })
            
        job_data_for_email = {
            "title": job.title,
            "required_skills": job.required_skills or []
        }
        
        async def trigger_batch_emails(candidates_data, j_data):
            for c_data in candidates_data:
                if c_data["ai_recommendation"] == "recommended":
                    await send_selection_email(
                        candidate_email=c_data["email"],
                        candidate_name=f"{c_data['first_name']} {c_data['last_name']}",
                        job_title=j_data["title"]
                    )
                elif c_data["ai_recommendation"] == "not_recommended":
                    # Generate learning path for rejection feedback
                    lp_result = await gemini_service.generate_learning_path(
                        candidate_data=c_data,
                        job_data=j_data,
                        status="rejected"
                    )
                    
                    if lp_result.get("success"):
                        learning_resources = []
                        for area in lp_result.get("weak_areas", []):
                            learning_resources.append({
                                "skill": area.get("skill"),
                                "reason": area.get("reason"),
                                "courses": [{"title": "Recommended Resource", "url": f"https://www.youtube.com/results?search_query={area.get('youtube_course_search')}"}]
                            })
                        
                        if not learning_resources:
                            for path in lp_result.get("learning_paths", []):
                                learning_resources.append({
                                    "skill": path.get("skill"),
                                    "reason": path.get("explanation"),
                                    "courses": path.get("courses", [])
                                })

                        await send_rejection_email_with_feedback(
                            candidate_email=c_data["email"],
                            candidate_name=f"{c_data['first_name']} {c_data['last_name']}",
                            job_title=j_data["title"],
                            missing_skills=[],
                            learning_path_content=learning_resources
                        )

        # Trigger batch email task
        import asyncio
        asyncio.create_task(trigger_batch_emails(batch_data, job_data_for_email))
            
    except Exception as email_err:
        print(f"Failed to initiate batch automated emails: {email_err}")
    # --------------------------------------------

    return {
        "message": f"Screened {screened_count} candidates",
        "screened_count": screened_count
    }


@router.post("/apply-rules")
async def apply_hr_rules_to_screening(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Apply HR rules to filter candidates."""
    # Get active rules for job
    rules = db.query(models.HRRule).filter(
        models.HRRule.is_active == True,
        ((models.HRRule.job_id == job_id) | (models.HRRule.job_id.is_(None)))
    ).all()
    
    if not rules:
        return {"message": "No active rules found", "affected_count": 0}
    
    # Parse rules
    parsed_rules = []
    for rule in rules:
        if rule.extracted_conditions:
            parsed_rules.append(rule.extracted_conditions)
        else:
            parsed_rules.append(nlp_service.parse_hr_rule(rule.rule_text))
    
    # Get candidates
    candidates = db.query(models.Candidate).filter(
        models.Candidate.job_id == job_id,
        models.Candidate.status != models.CandidateStatus.REJECTED
    ).all()
    
    affected_count = 0
    for candidate in candidates:
        passes, reasons = nlp_service.apply_hr_rules(
            candidate.extracted_skills or [],
            candidate.experience_years or 0,
            parsed_rules
        )
        
        if not passes:
            candidate.status = models.CandidateStatus.REJECTED
            candidate.notes = f"Filtered by HR rules: {'; '.join(reasons)}"
            affected_count += 1
    
    db.commit()
    
    return {
        "message": f"Applied rules, {affected_count} candidates filtered",
        "affected_count": affected_count
    }
