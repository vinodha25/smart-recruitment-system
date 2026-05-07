"""Candidate Management API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import aiofiles
import os
from datetime import datetime
from ..database import get_db
from .. import models, schemas
from ..services import get_current_user, nlp_service, gemini_service

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])

# Upload directory
UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=List[schemas.CandidateResponse])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=1000),
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    recommendation: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all candidates with optional filtering."""
    query = db.query(models.Candidate).options(joinedload(models.Candidate.job))
    
    if job_id:
        query = query.filter(models.Candidate.job_id == job_id)
    if status:
        query = query.filter(models.Candidate.status == status)
    if recommendation:
        query = query.filter(models.Candidate.ai_recommendation == recommendation)
    if search:
        query = query.filter(
            (models.Candidate.first_name.ilike(f"%{search}%")) |
            (models.Candidate.last_name.ilike(f"%{search}%")) |
            (models.Candidate.email.ilike(f"%{search}%"))
        )
    
    candidates = query.order_by(models.Candidate.applied_at.desc()).offset(skip).limit(limit).all()
    print(f"DEBUG: Found {len(candidates)} candidates for job_id={job_id}")
    return candidates


@router.get("/{candidate_id}", response_model=schemas.CandidateDetail)
async def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Get detailed candidate information."""
    candidate = db.query(models.Candidate).options(joinedload(models.Candidate.job)).filter(
        models.Candidate.id == candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return candidate


@router.get("/{candidate_id}/resume")
async def get_candidate_resume(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    """Download candidate resume."""
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate.resume_file_path:
         raise HTTPException(status_code=404, detail="No resume file associated with this candidate")

    if not os.path.exists(candidate.resume_file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on server")
        
    return FileResponse(
        candidate.resume_file_path,
        filename=os.path.basename(candidate.resume_file_path),
        content_disposition_type="inline"
    )



@router.post("", response_model=schemas.CandidateResponse)
async def create_candidate(
    candidate: schemas.CandidateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manually create a new candidate."""
    # Check if job exists
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db_candidate = models.Candidate(
        **candidate.model_dump(),
        status=models.CandidateStatus.NEW
    )
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    
    return db_candidate


@router.post("/upload-resume", response_model=schemas.ResumeUploadResponse)
async def upload_resume(
    job_id: int = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload resume and create candidate with NLP processing."""
    # Check if job exists
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{first_name}_{last_name}_{resume.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await resume.read()
        await f.write(content)
    
    # Extract text from resume
    resume_text = ""
    try:
        if filename.lower().endswith('.pdf'):
            resume_text = nlp_service.extract_text_from_pdf(file_path)
            # Fallback if PDF text extraction fails (e.g. scanned PDF)
            if not resume_text or len(resume_text) < 50:
                 # In this case we might want to rely on Gemini Vision later, 
                 # but for now let's set a marker or try to extract bytes but that won't work for PDF.
                 # We'll leave it empty/short so Gemini Service triggers its file-path logic.
                 print(f"Warning: PDF text extraction yielded low content for {filename}")
        else:
            # Assume text/markdown/etc
            resume_text = content.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Text extraction failed: {e}")
        resume_text = ""
    
    if not resume_text:
        resume_text = "Resume content (extraction failed or pending AI analysis)"
    
    # NLP processing
    skills_data = nlp_service.extract_skills(resume_text)
    all_skills = skills_data["technical"] + skills_data["soft"]
    experience_years = nlp_service.extract_experience_years(resume_text)
    education = nlp_service.extract_education(resume_text)
    
    # Calculate match scores
    no_job_requirements = not job.required_skills and not job.preferred_skills and not job.min_experience_years
    
    if no_job_requirements:
        # Resume Strength / Completeness Score (General Application)
        # Base score for valid parsing
        skill_match = 100.0 if all_skills else 0.0
        experience_match = 100.0 if experience_years > 0 else 50.0
        education_match = 100.0 if education else 50.0
        
        # Weighted Resume Strength Score
        overall_score = 40.0 # Base for successful parsing
        if all_skills: overall_score += 30.0
        if education or experience_years > 0: overall_score += 30.0
        
        recommendation = "review" # Default to neutral for general pool
    else:
        # Match against Job Requirements
        skill_match = nlp_service.calculate_skill_match_score(
            all_skills,
            job.required_skills or [],
            job.preferred_skills or []
        )
        
        experience_match = nlp_service.calculate_experience_match_score(
            experience_years,
            job.min_experience_years or 0
        )
        
        education_match = 75.0  # Default for now
        if education:
            education_match = 85.0
        
        # Calculate overall score
        overall_score = (skill_match * 0.5) + (experience_match * 0.3) + (education_match * 0.2)
        
        # Determine recommendation based on specific job fit
        if overall_score >= 75:
            recommendation = "recommended"
        elif overall_score >= 50:
            recommendation = "review"
        else:
            recommendation = "not_recommended"
    
    # Create candidate
    db_candidate = models.Candidate(
        job_id=job_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        resume_file_path=file_path,
        resume_text=resume_text[:5000],  # Limit stored text
        extracted_skills=all_skills,
        experience_years=experience_years,
        education=education,
        overall_score=overall_score,
        skill_match_score=skill_match,
        experience_match_score=experience_match,
        education_match_score=education_match,
        ai_recommendation=recommendation,
        status=models.CandidateStatus.SCREENING,
        source="resume_upload"
    )
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    
    # Send Acknowledgment Email
    try:
        from ..services import email_service
        # Background task or direct await? User asked for Async. 
        # Since this is an async route, we can await it.
        await email_service.send_acknowledgment_email(
            candidate_email=email,
            first_name=first_name,
            job_title=job.title
        )
    except Exception as e:
        print(f"Failed to send acknowledgment email: {e}")

    # Trigger Deep AI Analysis automatically
    try:
        print(f"Auto-triggering AI analysis for {first_name} {last_name}...")
        ai_analysis = await gemini_service.generate_detailed_analysis(
            candidate_text=resume_text[:5000],
            candidate_email=email,
            candidate_skills=all_skills,
            candidate_experience=experience_years,
            job_title=job.title,
            job_description=job.description or job.title,
            job_required_skills=job.required_skills or [],
            file_path=file_path
        )

        if ai_analysis.get("success"):
            db_candidate.ai_analysis_json = ai_analysis
            db_candidate.ai_insight = ai_analysis.get("justification", "")
            
            # Enrich data if AI found more
            if ai_analysis.get("work_history"):
                db_candidate.work_history = ai_analysis["work_history"]
            elif ai_analysis.get("extracted_info", {}).get("work_history"):
                db_candidate.work_history = ai_analysis["extracted_info"]["work_history"]

            if ai_analysis.get("education"): 
                # db_candidate.education = ai_analysis["education"] 
                pass
            elif ai_analysis.get("extracted_info", {}).get("education"):
                # db_candidate.education = ai_analysis["extracted_info"]["education"]
                pass
            
            # Update recommendation if AI feels strongly different? 
            # For now, keep the rule-based one or let AI refine it.
            # If standard score was low but AI sees potential (e.g. implicitly), maybe bump?
            # Let's trust rule-base for sorting, AI for insight.
            
            db.commit()
            db.refresh(db_candidate)
            print("AI analysis saved successfully.")
    except Exception as e:
        print(f"Auto-AI analysis failed: {e}")
        # Non-blocking failure, we still return the candidate
    
    return schemas.ResumeUploadResponse(
        candidate_id=db_candidate.id,
        extracted_text=resume_text[:500] + "...",
        extracted_skills=all_skills,
        experience_years=experience_years,
        message="Resume processed and analyzed by AI successfully"
    )


@router.post("/{candidate_id}/screen")
async def screen_candidate(
    candidate_id: int,
    screen_request: Optional[schemas.ScreeningRequest] = None,
    db: Session = Depends(get_db)
):
    """Run AI screening on a candidate."""
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Use job_id from request or candidate's own job_id
    target_job_id = screen_request.job_id if screen_request and screen_request.job_id else candidate.job_id
    
    if target_job_id:
        job = db.query(models.Job).filter(models.Job.id == target_job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Associated job not found")

        # If job changed, update candidate's job_id
        if target_job_id != candidate.job_id:
            candidate.job_id = target_job_id
            
        # 1. Standard ATS Match Score (Rule-based)
        final_score, breakdown = nlp_service.calculate_ats_overall_score(candidate, job)
        
        job_title = job.title
        job_desc = job.description or job_title
        job_reqs = job.required_skills or []
    else:
        # General Application - No specific job context
        # Use a fallback resume completeness score
        skills = candidate.extracted_skills or []
        math_overall_score = 40.0
        if skills: math_overall_score += 30.0
        if (candidate.experience_years or 0) > 0: math_overall_score += 30.0
        
        final_score = math_overall_score
        breakdown = {
            "required_skills": 30.0 if skills else 0,
            "experience": 30.0 if (candidate.experience_years or 0) > 0 else 0,
            "responsibilities": 0,
            "education": 20.0 if candidate.education else 0,
            "preferred": 0,
            "bonus": 20.0 if candidate.resume_text and "github.com" in candidate.resume_text.lower() else 0
        }
        
        job_title = "General Position"
        job_desc = "Standard software engineering role"
        job_reqs = ["communication", "teamwork", "problem solving"]

    # 2. Trigger Deep AI Analysis (Gemini)
    try:
        ai_analysis = await gemini_service.generate_detailed_analysis(
            candidate_text=candidate.resume_text[:5000] if candidate.resume_text else "",
            candidate_email=candidate.email,
            candidate_skills=candidate.extracted_skills or [],
            candidate_experience=candidate.experience_years or 0,
            job_title=job_title,
            job_description=job_desc,
            job_required_skills=job_reqs,
            file_path=candidate.resume_file_path
        )
        
        if ai_analysis.get("success"):
            candidate.ai_analysis_json = ai_analysis
            candidate.ai_insight = ai_analysis.get("justification", "")
            
            # Update detailed history if returned by Gemini
            if ai_analysis.get("work_history"):
                candidate.work_history = ai_analysis["work_history"]
            elif ai_analysis.get("extracted_info", {}).get("work_history"):
                candidate.work_history = ai_analysis["extracted_info"]["work_history"]
                
            if ai_analysis.get("internship_history"):
                candidate.internship_history = ai_analysis["internship_history"]
            elif ai_analysis.get("extracted_info", {}).get("internship_history"):
                candidate.internship_history = ai_analysis["extracted_info"]["internship_history"]
            
            if ai_analysis.get("work_experience_years") is not None:
                candidate.work_experience_years = float(ai_analysis["work_experience_years"])
            elif ai_analysis.get("extracted_info", {}).get("work_experience_years") is not None:
                candidate.work_experience_years = float(ai_analysis["extracted_info"]["work_experience_years"])
                
            if ai_analysis.get("internship_experience_years") is not None:
                candidate.intern_experience_years = float(ai_analysis["internship_experience_years"])
            elif ai_analysis.get("extracted_info", {}).get("internship_experience_years") is not None:
                candidate.intern_experience_years = float(ai_analysis["extracted_info"]["internship_experience_years"])

            if ai_analysis.get("extracted_info", {}).get("education"):
                candidate.education = ai_analysis["extracted_info"]["education"]

            # If AI gave a score and math score was low (parsing fail), boost it
            if ai_analysis.get("overall_fit_score", 0) > final_score:
                final_score = ai_analysis.get("overall_fit_score")
    except Exception as e:
        print(f"AI Analysis failed during re-screen: {e}")

    # Determine recommendation based on final score
    if final_score >= 75:
        recommendation = "recommended"
    elif final_score >= 50:
        recommendation = "review"
    else:
        recommendation = "not_recommended"
    
    # Update candidate with granular scores
    candidate.overall_score = final_score
    candidate.ats_score = final_score
    candidate.ats_breakdown = breakdown
    candidate.skill_match_score = breakdown.get("required_skills", 0)
    candidate.experience_match_score = breakdown.get("experience", 0)
    candidate.education_match_score = breakdown.get("education", 0)
    candidate.responsibility_match_score = breakdown.get("responsibilities", 0)
    candidate.preferred_match_score = breakdown.get("preferred", 0)
    candidate.bonus_score = breakdown.get("bonus", 0)
    candidate.ai_recommendation = recommendation
    candidate.status = models.CandidateStatus.SCREENING
    
    db.commit()
    
    return {
        "candidate_id": candidate_id,
        "overall_score": final_score,
        "ats_score": final_score,
        "breakdown": breakdown,
        "ai_recommendation": recommendation,
        "ai_insight": candidate.ai_insight
    }


@router.post("/{candidate_id}/shortlist")
async def shortlist_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Shortlist a candidate."""
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.status = models.CandidateStatus.SHORTLISTED
    db.commit()
    
    return {"message": "Candidate shortlisted", "status": "shortlisted"}


@router.delete("/{candidate_id}")
async def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a candidate."""
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    db.delete(candidate)
    db.commit()
    
    return {"message": "Candidate deleted successfully"}


@router.put("/{candidate_id}", response_model=schemas.CandidateResponse)
async def update_candidate(
    candidate_id: int,
    candidate_update: schemas.CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update candidate details."""
    db_candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    update_data = candidate_update.model_dump(exclude_unset=True)
    
    # Check if job_id is being updated -> Might need to update status or trigger something?
    # For now, just update.
    
    for field, value in update_data.items():
        setattr(db_candidate, field, value)
    
    db.commit()
    db.refresh(db_candidate)
    return db_candidate


@router.get("/{candidate_id}/ai/learning")
async def get_learning_path(candidate_id: int, db: Session = Depends(get_db)):
    """Generate or retrieve learning path for candidate."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    required_skills = job.required_skills if job else []
    
    # Calculate gaps
    candidate_skills = set(candidate.extracted_skills or [])
    skill_gaps = [skill for skill in required_skills if skill not in candidate_skills]
    
    result = await gemini_service.generate_learning_path(
        candidate_data={
            "first_name": candidate.first_name,
            "last_name": candidate.last_name,
            "extracted_skills": candidate.extracted_skills or [],
        },
        job_data={
            "title": job.title if job else "General Position",
            "required_skills": required_skills
        },
        status=candidate.status.value if hasattr(candidate.status, 'value') else str(candidate.status)
    )
    
    return {
        "title": "Personalized Learning Path",
        "type": "learning",
        "content": result.get("learning_paths", []),
        "email_subject": result.get("email_subject"),
        "email_body": result.get("email_body")
    }


@router.get("/{candidate_id}/ai/predictor")
async def get_success_prediction(candidate_id: int, db: Session = Depends(get_db)):
    """Predict candidate's post-hire success."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    
    result = await gemini_service.generate_success_prediction(
        candidate_data={"experience_years": candidate.experience_years, "skill_match_score": candidate.skill_match_score, "extracted_skills": candidate.extracted_skills},
        job_data={"title": job.title if job else "General Position"}
    )
    
    # Save score to candidate if available
    if result.get("success_score"):
        candidate.success_prediction_score = result["success_score"]
        db.commit()
        
    return {
        "title": "Success Prediction Analysis",
        "type": "predictor",
        "content": result
    }


@router.get("/{candidate_id}/ai/fit")
async def get_team_compatibility(candidate_id: int, db: Session = Depends(get_db)):
    """Analyze team compatibility."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    if not job:
        # Fallback if no job found
        job_title = "General Team"
        team_skills = ["Communication", "Collaboration"]
    else:
        job_title = job.title
        # Gather team context from other candidates in advanced stages
        team_members = db.query(models.Candidate).filter(
            models.Candidate.job_id == job.id,
            models.Candidate.id != candidate_id,
            models.Candidate.status.in_([
                models.CandidateStatus.HIRED, 
                models.CandidateStatus.OFFER, 
                models.CandidateStatus.INTERVIEW,
                models.CandidateStatus.SHORTLISTED
            ])
        ).limit(5).all()

        team_skills = set()
        # Add job required skills as baseline team expectation
        if job.required_skills:
            for s in job.required_skills:
                team_skills.add(s)
        
        # Add high-level skills from team members
        for member in team_members:
            if member.extracted_skills:
                # Take top 5 skills from each member to avoid noise
                for s in member.extracted_skills[:5]:
                    team_skills.add(s)
        
        team_skills = list(team_skills)[:20] # Limit to top 20 relevant skills

    # Construct team profile
    team_profile = {
        "size": "Estimated 5-10 people",
        "skills": list(team_skills) or ["Communication", "Agile", "Problem Solving"],
        "context": f"Targeting role: {job_title}"
    }
    
    result = await gemini_service.analyze_team_compatibility(
        candidate_profile={
            "skills": candidate.extracted_skills or [], 
            "experience": candidate.experience_years or 0
        },
        team_profile=team_profile
    )
    
    return {
        "title": "Team Compatibility Insights",
        "type": "fit",
        "content": result
    }


@router.get("/{candidate_id}/ai/sim")
async def get_career_simulation(candidate_id: int, db: Session = Depends(get_db)):
    """Simulate career path within company."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    result = await gemini_service.generate_career_path(
        candidate_skills=candidate.extracted_skills or [],
        current_experience=candidate.experience_years or 0
    )
    
    return {
        "title": "Career Progression Simulator",
        "type": "sim",
        "content": result.get("career_paths", [])
    }

@router.get("/{candidate_id}/ai/cost")
async def get_cost_intelligence(candidate_id: int, db: Session = Depends(get_db)):
    """Analyze hiring cost and ROI."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    
    result = await gemini_service.generate_cost_intelligence(
        candidate_data={"experience_years": candidate.experience_years, "overall_score": candidate.overall_score},
        job_data={"title": job.title if job else "General Position", "salary_min": job.salary_min or 0, "salary_max": job.salary_max or 0}
    )
    
    return {
        "title": "Cost & ROI Intelligence",
        "type": "cost",
        "content": result
    }


@router.get("/{candidate_id}/ai/explain")
async def get_candidate_explanation(candidate_id: int, db: Session = Depends(get_db)):
    """Generate or retrieve explanation for candidate score."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    
    # Prepare data for service
    candidate_data = {
        "first_name": candidate.first_name,
        "last_name": candidate.last_name,
        "extracted_skills": candidate.extracted_skills or [],
        "experience_years": candidate.experience_years
    }
    
    job_data = {
        "title": job.title if job else "General Position",
        "required_skills": job.required_skills if job else [],
        "min_experience_years": job.min_experience_years if job else 0
    }
    
    screening_result = {
        "overall_score": candidate.overall_score,
        "skill_match_score": candidate.skill_match_score,
        "experience_match_score": candidate.experience_match_score,
        "education_match_score": candidate.education_match_score,
        "ai_recommendation": candidate.ai_recommendation
    }
    
    result = await gemini_service.generate_candidate_explanation(
        candidate_data=candidate_data,
        job_data=job_data,
        screening_result=screening_result
    )
    
    return result
