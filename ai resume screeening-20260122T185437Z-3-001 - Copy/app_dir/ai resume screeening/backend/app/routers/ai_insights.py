"""AI Insights API routes."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
from ..services import get_current_user, gemini_service, nlp_service

router = APIRouter(prefix="/api/ai", tags=["AI Insights"])

def check_ai_enabled(module: str, db: Session):
    """Check if a specific AI module is enabled."""
    config = db.query(models.AISettings).first()
    if not config:
        return True # Default to true if no config
    
    if module == "skill_explanation" and not config.enable_skill_explanation:
        raise HTTPException(status_code=400, detail="Skill explanation module is disabled")
    if module == "learning_recommendation" and not config.enable_learning_recommendation:
        raise HTTPException(status_code=400, detail="Learning recommendation module is disabled")
    if module == "post_hire_prediction" and not config.enable_post_hire_prediction:
        raise HTTPException(status_code=400, detail="Post-hire prediction module is disabled")
    if module == "team_compatibility" and not config.enable_team_compatibility:
        raise HTTPException(status_code=400, detail="Team compatibility module is disabled")

@router.post("/explain/{candidate_id}", response_model=schemas.AIExplanationResponse)
async def generate_explanation(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate detailed explanation for candidate score."""
    check_ai_enabled("skill_explanation", db)
    
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Prepare data for AI
    candidate_data = {
        "first_name": candidate.first_name,
        "last_name": candidate.last_name,
        "extracted_skills": candidate.extracted_skills or [],
        "experience_years": candidate.experience_years
    }
    
    job_data = {
        "title": job.title,
        "required_skills": job.required_skills or [],
        "min_experience_years": job.min_experience_years
    }
    
    screening_result = {
        "overall_score": candidate.overall_score,
        "skill_match_score": candidate.skill_match_score,
        "experience_match_score": candidate.experience_match_score,
        "education_match_score": candidate.education_match_score,
        "ai_recommendation": candidate.ai_recommendation
    }
    
    # Call Gemini
    result = await gemini_service.generate_candidate_explanation(
        candidate_data, job_data, screening_result
    )
    
    # Update candidate with insight
    candidate.ai_insight = result.get("explanation")
    db.commit()
    
    return schemas.AIExplanationResponse(
        candidate_id=candidate.id,
        explanation=result.get("explanation", ""),
        recommendation=result.get("recommendation", ""),
        key_factors=result.get("strengths", []) + result.get("concerns", []),
        confidence_score=result.get("confidence_score", 0.0)
    )

@router.post("/learning-path/{candidate_id}", response_model=List[schemas.LearningPathResponse])
async def generate_learning_path(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate learning path for skill gaps."""
    check_ai_enabled("learning_recommendation", db)
    
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    if not job:
        raise HTTPException(status_code=400, detail="Candidate has no job assigned. Required for skill gap analysis.")
    
    # Identify gaps
    candidate_skills = set(candidate.extracted_skills or [])
    required_skills = set(job.required_skills or [])
    skill_gaps = list(required_skills - candidate_skills)
    
    if not skill_gaps:
        return []
        
    # Call Gemini - pass Dicts as expected by gemini_service
    candidate_data = {
        "first_name": candidate.first_name,
        "last_name": candidate.last_name,
        "extracted_skills": list(candidate_skills)
    }
    job_data = {
        "title": job.title if job else "Position",
        "required_skills": list(required_skills)
    }
    
    result = await gemini_service.generate_learning_path(
        candidate_data, job_data, status=candidate.status.value
    )
    
    paths = []
    if result.get("success"):
        # Clear existing paths
        db.query(models.LearningPath).filter(models.LearningPath.candidate_id == candidate_id).delete()
        
        for item in result.get("learning_paths", []):
            path = models.LearningPath(
                candidate_id=candidate_id,
                skill_name=item.get("skill"),
                current_level=0, # Estimated
                target_level=80, # Target
                recommended_courses=item.get("courses"),
                estimated_duration=item.get("duration"),
                priority=item.get("priority", "medium"),
                ai_explanation=item.get("explanation")
            )
            db.add(path)
            paths.append(path)
            
        db.commit()
        
    return paths

@router.post("/success-prediction/{candidate_id}", response_model=schemas.SuccessPredictionResponse)
async def predict_success(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Predict post-hire success."""
    check_ai_enabled("post_hire_prediction", db)
    
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    
    # Prepare data
    candidate_data = {
        "experience_years": candidate.experience_years,
        "skill_match_score": candidate.skill_match_score,
        "extracted_skills": candidate.extracted_skills or []
    }
    
    job_data = {
        "title": job.title
    }
    
    # Call Gemini
    result = await gemini_service.generate_success_prediction(candidate_data, job_data)
    
    if result.get("success"):
        # Save prediction
        prediction = models.SuccessPrediction(
            candidate_id=candidate_id,
            success_score=result.get("success_score"),
            retention_probability=result.get("retention"),
            performance_prediction=result.get("performance"),
            time_to_productivity=result.get("productivity_time"),
            positive_factors=result.get("positive_factors"),
            risk_factors=result.get("risk_factors"),
            ai_explanation=result.get("explanation"),
            confidence_level=0.8
        )
        
        # Check if exists and update or create
        existing = db.query(models.SuccessPrediction).filter(models.SuccessPrediction.candidate_id == candidate_id).first()
        if existing:
            db.delete(existing)
            
        db.add(prediction)
        
        # Update candidate score
        candidate.success_prediction_score = result.get("success_score")
        
        db.commit()
        db.refresh(prediction)
        return prediction
        
    raise HTTPException(status_code=500, detail="Failed to generate prediction")

@router.post("/team-compatibility/{candidate_id}", response_model=schemas.TeamCompatibilityResponse)
async def analyze_team(
    candidate_id: int,
    team_id: str = "default",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Analyze team compatibility."""
    check_ai_enabled("team_compatibility", db)
    
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Mock team profile for demo
    team_profile = {
        "size": 5,
        "skills": ["Python", "SQL", "FastAPI", "React"],
        "name": team_id
    }
    
    candidate_profile = {
        "skills": candidate.extracted_skills or [],
        "experience": candidate.experience_years
    }
    
    result = await gemini_service.analyze_team_compatibility(candidate_profile, team_profile)
    
    if result.get("success"):
        analysis = models.TeamCompatibility(
            candidate_id=candidate_id,
            team_id=team_id,
            overall_compatibility=result.get("overall_compatibility"),
            communication_style_match=result.get("communication_style_match"),
            work_style_match=result.get("work_style_match"),
            skills_complement=result.get("skills_complement"),
            strengths=result.get("strengths"),
            potential_challenges=result.get("challenges", []), # Map 'challenges' to 'potential_challenges' if needed
            ai_recommendation=result.get("recommendation")
        )
        
        existing = db.query(models.TeamCompatibility).filter(
            models.TeamCompatibility.candidate_id == candidate_id,
            models.TeamCompatibility.team_id == team_id
        ).first()
        
        if existing:
            db.delete(existing)
            
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return analysis
        
    raise HTTPException(status_code=500, detail="Failed to analyze compatibility")

@router.post("/career-path/{candidate_id}")
async def career_simulation(
    candidate_id: int,
    payload: dict = {},
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate career path simulation."""
    check_ai_enabled("career_simulation", db)
    
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    current_role = payload.get("currentRole", "") if payload else ""
    updates = payload.get("updates", "") if payload else ""
    
    result = await gemini_service.generate_career_path(
        candidate.extracted_skills or [],
        candidate.experience_years or 0,
        current_role,
        updates
    )
    
    return result

@router.post("/cost-intelligence/{candidate_id}", response_model=schemas.CostIntelligenceResponse)
async def cost_intelligence(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate cost intelligence and ROI analysis."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    
    candidate_data = {
        "experience_years": candidate.experience_years,
        "overall_score": candidate.overall_score
    }
    
    job_data = {
        "salary_min": job.salary_min,
        "salary_max": job.salary_max
    }
    
    result = await gemini_service.generate_cost_intelligence(candidate_data, job_data)
    
    # Helper to parse currency string if needed
    def parse_currency(val):
        if isinstance(val, (int, float)): return val
        if not val: return 0.0
        try:
            return float(str(val).replace('$', '').replace(',', ''))
        except:
            return 0.0

    total_inv = result.get("total_investment")
    if total_inv is None and result.get("total_cost_estimate"):
        total_inv = parse_currency(result.get("total_cost_estimate"))
        
    return schemas.CostIntelligenceResponse(
        success=result.get("success", False),
        estimated_salary=result.get("estimated_salary"),
        total_investment=total_inv,
        roi_level=result.get("roi_level") or result.get("roi_prediction"),
        value_classification=result.get("value_classification"),
        cost_tips=result.get("cost_tips", []),
        ai_analysis=result.get("ai_analysis") or result.get("justification")
    )
