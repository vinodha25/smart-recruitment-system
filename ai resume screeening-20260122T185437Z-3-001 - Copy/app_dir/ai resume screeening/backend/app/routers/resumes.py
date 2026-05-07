"""Resume upload and management API routes."""
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Form
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime
from ..database import get_db
from .. import models, schemas
from ..services.auth_service import get_current_user
from ..services.nlp_service import nlp_service
from ..services.gemini_service import gemini_service
from ..services.email_service import send_selection_email, send_rejection_email_with_feedback
import asyncio
import re

def _is_valid_real_email(email: str) -> bool:
    """Check if an email is a real extracted email (not a placeholder)."""
    if not email:
        return False
    # Reject known placeholder patterns
    placeholder_patterns = [
        r'@example\.com$',
        r'^candidate',
        r'\(candidate\)',
        r'candidateexample',
    ]
    for pattern in placeholder_patterns:
        if re.search(pattern, email, re.IGNORECASE):
            return False
    # Basic email format validation
    email_regex = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    return bool(re.match(email_regex, email))

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=schemas.ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    job_id: Optional[int] = Form(None),
    recruiter_name: Optional[str] = Form(None),
    application_date: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload and parse a resume."""
    print(f"DEBUG: upload_resume called with job_id={job_id}, file={file.filename}, recruiter={recruiter_name}")
    
    # Ensure job_id is None if 0 (common frontend default)
    if job_id == 0:
        job_id = None
    
    # Parse application date if provided
    applied_at = datetime.utcnow()
    if application_date:
        try:
            # Try parsing ISO format or YYYY-MM-DD
            applied_at = datetime.fromisoformat(application_date.replace('Z', '+00:00'))
        except ValueError:
            pass

    # Validate file type
    if not file.filename.endswith(('.pdf', '.doc', '.docx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and Word documents are supported"
        )
    
    # ... (Rest of file saving logic is unchanged, just start after file verification) ...

    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Extract text and skills
    try:
        text = ""
        if file.filename.endswith('.pdf'):
            text = await run_in_threadpool(nlp_service.extract_text_from_pdf, file_path)
            
        if text:
            skills_data = await run_in_threadpool(nlp_service.extract_skills, text)
        else:
            skills_data = {}
            
        skills = skills_data.get("technical", []) + skills_data.get("soft", [])
        
        # New: Extract info
        extracted_email = await run_in_threadpool(nlp_service.extract_email, text)
        extracted_phone = await run_in_threadpool(nlp_service.extract_phone, text)
    except Exception as e:
        skills = []
        text = ""
        extracted_email = ""
        extracted_phone = ""
        print(f"NLP Error: {e}")
    
    # Parse name from filename
    clean_name = file.filename.replace('.pdf', '').replace('.docx', '').replace('.doc', '')
    separators = [" - ", "-", "_", " Resume", " resume"]
    candidate_name_part = clean_name
    
    for sep in separators:
        if sep in candidate_name_part:
            parts = candidate_name_part.split(sep)
            if parts[0].strip():
                candidate_name_part = parts[0].strip()
                break
    
    clean_name_final = candidate_name_part.replace('_', ' ').strip()
    name_parts = clean_name_final.split(' ')
    if len(name_parts) > 1:
        first_name = name_parts[0].title()
        last_name = ' '.join(name_parts[1:]).title()
    else:
        first_name = clean_name_final.title()
        last_name = "" 
        
    if not last_name:
        last_name = "" 
    
    # Only use the real extracted email — never generate a placeholder
    candidate_email = extracted_email if _is_valid_real_email(extracted_email) else ""
    
    # Pre-calculate experience to ensure it's saved even if AI fails
    exp_years = 0.0
    if text:
        exp_years = await run_in_threadpool(nlp_service.extract_experience_years, text)

    # Create candidate record FIRST to ensure it exists
    db_candidate = models.Candidate(
        first_name=first_name,
        last_name=last_name,
        email=candidate_email,
        phone=extracted_phone,
        job_id=job_id,
        resume_file_path=file_path,
        resume_text=text[:10000] if text else None, 
        extracted_skills=skills,
        experience_years=exp_years,
        status=models.CandidateStatus.NEW,
        applied_at=applied_at,
        recruiter_name=recruiter_name
    )
    
    # Initial Baseline Scoring (Rule-Based) - Calculate BEFORE DB add to ensure fields are populated
    job_title = "General Position"
    job_desc = "Standard software engineering role"
    job_reqs = ["communication", "teamwork"]
    
    if job_id:
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if job:
            job_title = job.title
            job_desc = job.description or job_title
            job_reqs = job.required_skills or []
            
            math_overall_score, breakdown = nlp_service.calculate_ats_overall_score(db_candidate, job)
            db_candidate.overall_score = math_overall_score
            db_candidate.ats_score = math_overall_score
            db_candidate.ats_breakdown = breakdown
            db_candidate.skill_match_score = breakdown.get("required_skills", 0)
            db_candidate.experience_match_score = breakdown.get("experience", 0)
            db_candidate.education_match_score = breakdown.get("education", 0)
            db_candidate.responsibility_match_score = breakdown.get("responsibilities", 0)
            db_candidate.preferred_match_score = breakdown.get("preferred", 0)
            db_candidate.bonus_score = breakdown.get("bonus", 0)
    else:
         # General Application Scoring
         math_overall_score = 40.0
         if skills: math_overall_score += 30.0
         if exp_years > 0: math_overall_score += 30.0
         db_candidate.overall_score = math_overall_score

    # Save basic candidate immediately with initial scores
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)

    # Add AI analysis (Post-creation)
    try:
        if text or file_path:
            # 2. Generate Detailed AI Analysis (ALWAYS RUN, even for general pool)
            # For image-based PDFs, text may be empty but Gemini Vision can read the file directly
            ai_analysis = await gemini_service.generate_detailed_analysis(
                candidate_text=text[:5000],
                candidate_email=candidate_email,
                candidate_skills=skills,
                candidate_experience=db_candidate.experience_years or 0,
                job_title=job_title,
                job_description=job_desc,
                job_required_skills=job_reqs,
                file_path=file_path
            )
            
            # 3. Apply AI Results or Fallback
            if ai_analysis.get("success"):
                # Check for Gemini-extracted info (Fallback for image PDFs)
                extracted_info = ai_analysis.get("extracted_info", {})
                if extracted_info:
                    print("DEBUG: Using Gemini-extracted info:", extracted_info)
                    
                    if extracted_info.get("full_text"):
                        # Save OCR text to DB
                        db_candidate.resume_text = extracted_info["full_text"]
                        
                        # Fallback: Try NLP extraction on the NEW OCR text if Gemini JSON missed fields
                        if not extracted_info.get("email"):
                             extracted_email_ocr = nlp_service.extract_email(extracted_info["full_text"])
                             if extracted_email_ocr:
                                 db_candidate.email = extracted_email_ocr
                                 
                        if not extracted_info.get("phone"):
                             extracted_phone_ocr = nlp_service.extract_phone(extracted_info["full_text"])
                             if extracted_phone_ocr:
                                 db_candidate.phone = extracted_phone_ocr

                    if extracted_info.get("email"):
                        db_candidate.email = extracted_info["email"]
                    if extracted_info.get("phone"):
                        db_candidate.phone = extracted_info["phone"]
                    if extracted_info.get("skills"):
                         # Merge or replace? Replace if original was empty.
                         if not skills:
                             db_candidate.extracted_skills = extracted_info["skills"]
                             skills = extracted_info["skills"] # Update local var for score calc if needed re-run
                    if extracted_info.get("years_of_experience"):
                         db_candidate.experience_years = float(extracted_info["years_of_experience"])
                    if extracted_info.get("work_experience_years") is not None:
                         db_candidate.work_experience_years = float(extracted_info["work_experience_years"])
                    if extracted_info.get("internship_experience_years") is not None:
                         db_candidate.intern_experience_years = float(extracted_info["internship_experience_years"])
                    if extracted_info.get("work_history"):
                         db_candidate.work_history = extracted_info["work_history"]
                    if extracted_info.get("internship_history"):
                         db_candidate.internship_history = extracted_info["internship_history"]

                    # Re-calculate scores if we got new data from Gemini?
                    # For simplicity, we trust the "overall_fit_score" from Gemini if it was provided
                
                # --- ENSURE EMAIL IS POPULATED FROM ALL SOURCES ---
                # If email is still empty after Gemini extraction, try re-extracting from updated resume_text
                if not _is_valid_real_email(db_candidate.email) and db_candidate.resume_text:
                    retried_email = nlp_service.extract_email(db_candidate.resume_text)
                    if _is_valid_real_email(retried_email):
                        db_candidate.email = retried_email
                        print(f"DEBUG: Email recovered from resume_text re-extraction: {retried_email}")
                
                # For general candidates, use AI score as helpful metric
                # For specific jobs, keep math score as baseline but show AI insight
                if not job_id:
                     db_candidate.overall_score = ai_analysis.get("overall_fit_score", math_overall_score)
                else: 
                     # If image PDF, math score is likely 0, so trust Gemini
                     if math_overall_score < 10 and ai_analysis.get("overall_fit_score", 0) > 0:
                         db_candidate.overall_score = ai_analysis.get("overall_fit_score")

                justification = ai_analysis.get("justification", "")
                db_candidate.ai_analysis_json = ai_analysis
                db_candidate.ai_insight = justification
                
                if ai_analysis.get("work_experience_years") is not None:
                     db_candidate.work_experience_years = float(ai_analysis["work_experience_years"])
                if ai_analysis.get("internship_experience_years") is not None:
                     db_candidate.intern_experience_years = float(ai_analysis["internship_experience_years"])
                if ai_analysis.get("work_history"):
                     db_candidate.work_history = ai_analysis["work_history"]
                if ai_analysis.get("internship_history"):
                     db_candidate.internship_history = ai_analysis["internship_history"]
                
                # Final ATS Scoring refinement after all data is extracted
                if job_id:
                     job = db.query(models.Job).filter(models.Job.id == job_id).first()
                     if job:
                         final_score, breakdown = nlp_service.calculate_ats_overall_score(db_candidate, job)
                         db_candidate.overall_score = final_score
                         db_candidate.ats_score = final_score
                         db_candidate.ats_breakdown = breakdown
                         db_candidate.skill_match_score = breakdown.get("required_skills")
                         db_candidate.experience_match_score = breakdown.get("experience")
                         db_candidate.education_match_score = breakdown.get("education")
                         db_candidate.responsibility_match_score = breakdown.get("responsibilities")
                         db_candidate.preferred_match_score = breakdown.get("preferred")
                         db_candidate.bonus_score = breakdown.get("bonus")
                
                # --- AUTO-GENERATE SUCCESS PREDICTION ---
                try:
                    # Prepare brief data structures for success prediction
                    sp_job_data = {"title": job_title}
                    sp_candidate_data = {
                        "experience_years": db_candidate.experience_years,
                        "skill_match_score": db_candidate.skill_match_score,
                        "extracted_skills": skills
                    }
                    
                    # Generate prediction
                    sp_result = await gemini_service.generate_success_prediction(sp_candidate_data, sp_job_data)
                    
                    if sp_result.get("success"):
                        # Save prediction record
                        prediction = models.SuccessPrediction(
                            candidate_id=db_candidate.id,
                            success_score=sp_result.get("success_score"),
                            retention_probability=sp_result.get("retention"),
                            performance_prediction=sp_result.get("performance"),
                            time_to_productivity=sp_result.get("productivity_time"),
                            positive_factors=sp_result.get("positive_factors"),
                            risk_factors=sp_result.get("risk_factors"),
                            ai_explanation=sp_result.get("explanation"),
                            confidence_level=0.8
                        )
                        db.add(prediction)
                        
                        # Update candidate major score
                        db_candidate.success_prediction_score = sp_result.get("success_score")
                except Exception as sp_e:
                    print(f"Auto-success prediction failed: {sp_e}")
                    # Fallback: Create a basic prediction record from the main analysis to ensure UI is populated
                    try:
                        fallback_score = ai_analysis.get("overall_fit_score", 50)
                        prediction = models.SuccessPrediction(
                            candidate_id=db_candidate.id,
                            success_score=fallback_score,
                            retention_probability=0.7,
                            performance_prediction="medium",
                            time_to_productivity="1-3 months",
                            positive_factors=ai_analysis.get("strengths", [])[:3],
                            risk_factors=ai_analysis.get("risk_factors", [])[:3],
                            ai_explanation=f"Prediction derived from overall fit score of {fallback_score}% due to analysis limitations.",
                            confidence_level=0.5
                        )
                        db.add(prediction)
                        db_candidate.success_prediction_score = fallback_score
                    except Exception as fallback_e:
                        print(f"Fallback prediction failed: {fallback_e}")
                # ----------------------------------------
            else:
                db_candidate.ai_insight = "AI Analysis unavailable. Profile analyzed using rule-based metrics."

            # Determine Recommendation based on Final Score
            final_score = db_candidate.overall_score or 0
            if final_score >= 75:
                recommendation = "recommended"
            elif final_score >= 50:
                recommendation = "review"
            else:
                recommendation = "not_recommended"
            
            db_candidate.ai_recommendation = recommendation
            db_candidate.status = models.CandidateStatus.SCREENING
            
            # Final email validation: ensure only real emails are stored
            if not _is_valid_real_email(db_candidate.email):
                # Attempt 1: Check AI analysis JSON for extracted email
                ai_email = (db_candidate.ai_analysis_json or {}).get("extracted_info", {}).get("email", "")
                if _is_valid_real_email(ai_email):
                    db_candidate.email = ai_email
                    print(f"DEBUG: Email recovered from AI JSON: {ai_email}")
                else:
                    # Attempt 2: One final NLP re-extraction from full resume text
                    if db_candidate.resume_text:
                        final_email = nlp_service.extract_email(db_candidate.resume_text)
                        if _is_valid_real_email(final_email):
                            db_candidate.email = final_email
                            print(f"DEBUG: Email recovered from final NLP pass: {final_email}")
                        else:
                            db_candidate.email = ""  # Clear any placeholder
                    else:
                        db_candidate.email = ""  # Clear any placeholder
            
            # Save updates
            db.commit()
            db.refresh(db_candidate)
            print(f"DEBUG: Detailed analysis complete for candidate {db_candidate.id}, status={db_candidate.status}")

            # --- AUTOMATED EMAIL NOTIFICATION ---
            try:
                # Skip email if no valid email address was found
                if not _is_valid_real_email(db_candidate.email):
                    print(f"DEBUG: Skipping automated email for candidate {db_candidate.id} - no valid email address found")
                    raise Exception("No valid email - skip")
                
                # Extract plain data to avoid DetachedInstanceError in background task
                candidate_data_for_email = {
                    "id": db_candidate.id,
                    "first_name": db_candidate.first_name,
                    "last_name": db_candidate.last_name,
                    "email": db_candidate.email,
                    "ai_recommendation": db_candidate.ai_recommendation,
                    "extracted_skills": db_candidate.extracted_skills or []
                }
                
                job_ref = db.query(models.Job).filter(models.Job.id == db_candidate.job_id).first() if db_candidate.job_id else None
                job_data_for_email = {
                    "title": job_ref.title if job_ref else "Position",
                    "required_skills": job_ref.required_skills or [] if job_ref else []
                }

                # Trigger email automation asynchronously
                async def trigger_automated_email(c_data, j_data):
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

                # Use asyncio.create_task to run background email task
                import asyncio
                asyncio.create_task(trigger_automated_email(candidate_data_for_email, job_data_for_email))
                
            except Exception as email_err:
                print(f"Failed to initiate automated email: {email_err}")
            # ------------------------------------
            
    except Exception as e:
        print(f"Error detailed screening: {e}")
        # Use simple fallback if everything failed
        try:
             # Ensure status is at least parsed or new, don't leave it in limbo if it was supposed to be screening
             # If we failed *after* math scores, we might want to keep those.
             # But for safety, let's just make sure it's committed.
             pass
        except:
             pass

    # Construct response
    return {
        "id": db_candidate.id,
        "file_path": file_path,
        "original_filename": file.filename,
        "file_size": os.path.getsize(file_path),
        "status": "parsed" if (skills or (db_candidate.overall_score and db_candidate.overall_score > 0)) else "processing",
        "candidate_name": f"{first_name} {last_name}".strip(),
        "position": db_candidate.job.title if db_candidate.job else "General Application",
        "skills": skills,
        "match_score": db_candidate.overall_score if db_candidate.overall_score is not None else 0.0,
        "email": db_candidate.email,
        "phone": db_candidate.phone,
        "recruiter_name": db_candidate.recruiter_name,
        "created_at": db_candidate.applied_at,
        "ai_analysis_json": db_candidate.ai_analysis_json,
        "ai_insight": db_candidate.ai_insight
    }


@router.get("", response_model=List[schemas.ResumeResponse])
async def get_resumes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all resumes (from candidates)."""
    # Fetch candidates that have a resume
    candidates = db.query(models.Candidate).filter(
        models.Candidate.resume_file_path.isnot(None)
    ).order_by(models.Candidate.applied_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for candidate in candidates:
        try:
            file_size = os.path.getsize(candidate.resume_file_path) if candidate.resume_file_path and os.path.exists(candidate.resume_file_path) else 0
            original_filename = os.path.basename(candidate.resume_file_path) if candidate.resume_file_path else "unknown.pdf"
            
            resume_dict = {
                "id": candidate.id,
                "file_path": candidate.resume_file_path or "",
                "original_filename": original_filename,
                "file_size": file_size,
                "status": "parsed" if (candidate.extracted_skills or (candidate.overall_score and candidate.overall_score > 0)) else "processing",
                "candidate_name": f"{candidate.first_name} {candidate.last_name}".strip(),
                "position": candidate.job.title if candidate.job else "General Application",
                "skills": candidate.extracted_skills if candidate.extracted_skills else [],
                "match_score": candidate.overall_score,
                "ai_analysis_json": candidate.ai_analysis_json,
                "ai_insight": candidate.ai_insight,
                "has_internship": "intern" in (candidate.resume_text or "").lower() or "internship" in (candidate.resume_text or "").lower(),
                "internship_details": [line.strip() for line in (candidate.resume_text or "").split('\n') if "intern" in line.lower() or "internship" in line.lower()][:3],
                "experience_years": candidate.experience_years,
                "email": candidate.email,
                "phone": candidate.phone,
                "recruiter_name": candidate.recruiter_name,
                "created_at": candidate.applied_at
            }
            result.append(resume_dict)
        except Exception as e:
            print(f"Error mapping candidate {candidate.id} to resume: {e}")
            continue
    
    return result


@router.get("/{resume_id}", response_model=schemas.ResumeResponse)
async def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific resume (via candidate ID)."""
    # resume_id is treated as candidate_id
    candidate = db.query(models.Candidate).filter(models.Candidate.id == resume_id).first()
    if not candidate or not candidate.resume_file_path:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    file_size = os.path.getsize(candidate.resume_file_path) if os.path.exists(candidate.resume_file_path) else 0
    original_filename = os.path.basename(candidate.resume_file_path)

    return {
        "id": candidate.id,
        "file_path": candidate.resume_file_path,
        "original_filename": original_filename,
        "file_size": file_size,
        "status": "parsed" if (candidate.extracted_skills or (candidate.overall_score and candidate.overall_score > 0)) else "processing",
        "candidate_name": f"{candidate.first_name} {candidate.last_name}",
        "position": candidate.job.title if candidate.job else "General Application",
        "skills": candidate.extracted_skills if candidate.extracted_skills else [],
        "match_score": candidate.overall_score,
        "ai_analysis_json": candidate.ai_analysis_json,
        "ai_insight": candidate.ai_insight,
        "has_internship": "intern" in (candidate.resume_text or "").lower() or "internship" in (candidate.resume_text or "").lower(),
        "internship_details": [line.strip() for line in (candidate.resume_text or "").split('\n') if "intern" in line.lower() or "internship" in line.lower()][:3],
        "experience_years": candidate.experience_years,
        "email": candidate.email,
        "phone": candidate.phone,
        "recruiter_name": candidate.recruiter_name,
        "created_at": candidate.applied_at
    }


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a resume (and associated candidate data)."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == resume_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Delete file
    try:
        if candidate.resume_file_path and os.path.exists(candidate.resume_file_path):
            os.remove(candidate.resume_file_path)
    except Exception:
        pass
    
    # We delete the candidate if resume is deleted? 
    # Or just clear the resume field? 
    # Ideally delete candidate since it was created from resume.
    db.delete(candidate)
    db.commit()
    
    return {"message": "Resume and candidate deleted successfully"}
