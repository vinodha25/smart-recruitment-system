from app.database import SessionLocal
from app import models
import json

def debug_score():
    db = SessionLocal()
    try:
        # Find the candidate matching the one in the screenshot
        # Name: Dharsans Resume-2 (2) -> first_name like "Dharsans", last_name like "Resume%"
        # Or look for the specific email I fixed: dharsans.resume-22@example.com
        
        candidate = db.query(models.Candidate).filter(
            models.Candidate.email.like("%dharsans%")
        ).first()
        
        if not candidate:
            print("Candidate not found.")
            return

        print(f"Candidate: {candidate.first_name} {candidate.last_name}")
        print(f"Candidate ID: {candidate.id}")
        print(f"Job ID: {candidate.job_id}")
        print(f"Calculated Overall Score: {candidate.overall_score}")
        print(f"Skill Match Score: {candidate.skill_match_score}")
        print(f"Experience Match Score: {candidate.experience_match_score}")
        print(f"Extracted Skills: {candidate.extracted_skills}")
        print(f"Experience Years: {candidate.experience_years}")
        
        if candidate.job_id:
            job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
            if job:
                print(f"\nJob: {job.title} (ID: {job.id})")
                print(f"Required Skills: {job.required_skills}")
                print(f"Min Experience: {job.min_experience_years}")
            else:
                print("\nJob not found.")
        else:
            print("\nCandidate is not linked to any job (General Application).")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_score()
