from app.database import SessionLocal
from app import models
import os
from dotenv import load_dotenv

def force_activate_all():
    load_dotenv()
    db = SessionLocal()
    try:
        # 1. Force Enable All AI Toggles
        config = db.query(models.AISettings).first()
        if not config:
            config = models.AISettings()
            db.add(config)
        
        config.enable_skill_explanation = True
        config.enable_learning_recommendation = True
        config.enable_post_hire_prediction = True
        config.enable_team_compatibility = True
        config.enable_career_simulation = True
        
        if not config.api_key:
            config.api_key = os.getenv("GEMINI_API_KEY", "")
        
        print("AI Toggles: SE=True, LR=True, PH=True, TC=True, CS=True")

        # 2. Seed Data for ALL Candidates
        candidates = db.query(models.Candidate).all()
        job = db.query(models.Job).first()
        
        for c in candidates:
            # Associate with job if missing
            if not c.job_id and job:
                c.job_id = job.id
            
            # Seed Success Prediction
            sp = db.query(models.SuccessPrediction).filter(models.SuccessPrediction.candidate_id == c.id).first()
            if not sp:
                sp = models.SuccessPrediction(
                    candidate_id=c.id,
                    success_score=70.0 + (c.id % 25),
                    retention_probability=0.8,
                    performance_prediction="high",
                    time_to_productivity="1 month",
                    positive_factors=["Good match", "Proven experience"],
                    risk_factors=["Minor skill gaps"],
                    ai_explanation="Diagnostic prediction seeded to verify UI functionality.",
                    confidence_level=0.7
                )
                db.add(sp)
            
            # Seed Learning Path
            lp = db.query(models.LearningPath).filter(models.LearningPath.candidate_id == c.id).first()
            if not lp:
                lp = models.LearningPath(
                    candidate_id=c.id,
                    skill="Advanced Python",
                    explanation="Improve proficiency in asynchronous programming.",
                    courses=[{"title": "Mastering Asyncio", "url": "https://www.youtube.com/results?search_query=asyncio+python"}]
                )
                db.add(lp)
            
            print(f"Seeded data for Candidate {c.id} ({c.first_name})")

        # 3. Seed Hiring Cost for ALL Jobs
        jobs = db.query(models.Job).all()
        for j in jobs:
            hc = db.query(models.HiringCost).filter(models.HiringCost.job_id == j.id).first()
            if not hc:
                hc = models.HiringCost(
                    job_id=j.id,
                    total_cost=4500.0,
                    sourcing_cost=1000.0,
                    screening_cost=500.0,
                    interview_cost=2000.0,
                    onboarding_cost=1000.0,
                    time_to_hire_days=14,
                    time_to_fill_days=21,
                    roi_prediction=115.0,
                    ai_analysis="Cost analysis active. Benchmarking against industry standards."
                )
                db.add(hc)

        db.commit()
        print("Force activation and seeding complete.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    force_activate_all()
