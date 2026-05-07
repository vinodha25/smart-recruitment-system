"""HR Rules API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from ..database import get_db
from .. import models, schemas
from ..services import get_current_user, require_hr, nlp_service

router = APIRouter(prefix="/api/hr-rules", tags=["HR Rules"])


@router.get("", response_model=List[schemas.HRRuleResponse])
async def list_hr_rules(
    job_id: Optional[int] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all HR rules."""
    query = db.query(models.HRRule)
    
    if job_id is not None:
        query = query.filter(
            (models.HRRule.job_id == job_id) | (models.HRRule.job_id.is_(None))
        )
    
    if active_only:
        query = query.filter(models.HRRule.is_active == True)
    
    rules = query.order_by(models.HRRule.priority.desc(), models.HRRule.created_at.desc()).all()
    return rules


@router.get("/{rule_id}", response_model=schemas.HRRuleResponse)
async def get_hr_rule(rule_id: int, db: Session = Depends(get_db)):
    """Get a specific HR rule."""
    rule = db.query(models.HRRule).filter(models.HRRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.post("", response_model=schemas.HRRuleResponse)
async def create_hr_rule(
    rule: schemas.HRRuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_hr)
):
    """
    Create a new HR rule.
    
    HR can enter natural language rules like:
    - "Remove Python candidates"
    - "Shortlist React developers only"
    - "Only consider candidates with 5+ years experience"
    """
    # Parse the rule text using NLP
    parsed = nlp_service.parse_hr_rule(rule.rule_text)
    
    # Determine rule type from parsing
    rule_type = parsed.get("action", "filter")
    
    # Set expiration for temporary rules (default 7 days)
    expires_at = None
    if rule.is_temporary:
        expires_at = datetime.utcnow() + timedelta(days=7)
    
    db_rule = models.HRRule(
        job_id=rule.job_id,
        rule_text=rule.rule_text,
        rule_type=rule_type,
        extracted_keywords=parsed.get("keywords", []),
        extracted_conditions=parsed,
        is_active=True,
        is_temporary=rule.is_temporary,
        priority=0,
        created_by=current_user.id,
        expires_at=expires_at
    )
    
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    return db_rule


@router.put("/{rule_id}", response_model=schemas.HRRuleResponse)
async def update_hr_rule(
    rule_id: int,
    rule_update: schemas.HRRuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_hr)
):
    """Update an HR rule."""
    db_rule = db.query(models.HRRule).filter(models.HRRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Re-parse if rule text changed
    parsed = nlp_service.parse_hr_rule(rule_update.rule_text)
    
    db_rule.rule_text = rule_update.rule_text
    db_rule.rule_type = parsed.get("action", "filter")
    db_rule.extracted_keywords = parsed.get("keywords", [])
    db_rule.extracted_conditions = parsed
    db_rule.is_temporary = rule_update.is_temporary
    
    db.commit()
    db.refresh(db_rule)
    
    return db_rule


@router.post("/{rule_id}/toggle")
async def toggle_hr_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_hr)
):
    """Toggle a rule's active status."""
    db_rule = db.query(models.HRRule).filter(models.HRRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db_rule.is_active = not db_rule.is_active
    db.commit()
    
    return {
        "message": f"Rule {'activated' if db_rule.is_active else 'deactivated'}",
        "is_active": db_rule.is_active
    }


@router.delete("/{rule_id}")
async def delete_hr_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_hr)
):
    """Delete an HR rule."""
    db_rule = db.query(models.HRRule).filter(models.HRRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db.delete(db_rule)
    db.commit()
    
    return {"message": "Rule deleted successfully"}


@router.post("/preview")
async def preview_rule_impact(
    rule_text: str,
    job_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Preview the impact of an HR rule before applying.
    Shows which candidates would be affected.
    """
    # Parse the rule
    parsed = nlp_service.parse_hr_rule(rule_text)
    
    # Get candidates
    query = db.query(models.Candidate)
    if job_id:
        query = query.filter(models.Candidate.job_id == job_id)
    
    candidates = query.filter(
        models.Candidate.status != models.CandidateStatus.REJECTED
    ).all()
    
    affected = []
    passing = []
    
    for candidate in candidates:
        passes, reasons = nlp_service.apply_hr_rules(
            candidate.extracted_skills or [],
            candidate.experience_years or 0,
            [parsed]
        )
        
        candidate_info = {
            "id": candidate.id,
            "name": f"{candidate.first_name} {candidate.last_name}",
            "skills": candidate.extracted_skills or [],
            "experience": candidate.experience_years or 0
        }
        
        if not passes:
            affected.append({**candidate_info, "reasons": reasons})
        else:
            passing.append(candidate_info)
    
    return {
        "rule_analysis": parsed,
        "affected_count": len(affected),
        "passing_count": len(passing),
        "affected_candidates": affected[:10],  # Limit preview
        "passing_candidates": passing[:10]
    }
