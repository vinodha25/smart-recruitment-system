"""AI Configuration API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from .. import models, schemas
from ..services import get_current_user, require_admin

router = APIRouter(prefix="/api/ai/config", tags=["AI Configuration"])

@router.get("", response_model=schemas.AISettingsResponse)
async def get_ai_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Get current AI configuration."""
    config = db.query(models.AISettings).first()
    
    if not config:
        # Return default config if none exists
        return schemas.AISettingsResponse(
            id=0,
            provider="Gemini",
            api_key="",
            api_model="gemini-1.5-flash",
            enable_skill_explanation=True,
            enable_learning_recommendation=True,
            enable_post_hire_prediction=True,
            enable_team_compatibility=True,
            temperature=0.7,
            max_tokens=2048,
            updated_at=datetime.utcnow()
        )
    
    # Mask API key for security
    response_data = config.__dict__.copy()
    response_data["api_key"] = schemas.AISettingsResponse.mask_key(config.api_key)
    return response_data

@router.put("", response_model=schemas.AISettingsResponse)
async def update_ai_config(
    settings: schemas.AISettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Update AI configuration."""
    config = db.query(models.AISettings).first()
    
    if not config:
        # Create new config
        config = models.AISettings(
            updated_by=current_user.id
        )
        db.add(config)
    
    # Update fields
    update_data = settings.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    config.updated_at = datetime.utcnow()
    config.updated_by = current_user.id
    
    db.commit()
    db.refresh(config)
    
    # Mask API key for response
    response_data = config.__dict__.copy()
    response_data["api_key"] = schemas.AISettingsResponse.mask_key(config.api_key)
    return response_data
