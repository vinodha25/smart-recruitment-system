
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
    
    update_data = candidate_update.dict(exclude_unset=True)
    
    # Special handling for converting string representation to enum if needed, though Pydantic usually handles it
    
    for field, value in update_data.items():
        setattr(db_candidate, field, value)
    
    db.commit()
    db.refresh(db_candidate)
    return db_candidate
