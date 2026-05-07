"""Initialize database with tables and sample data for production."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import User, Job, Candidate, AISettings
from app.services.auth_service import get_password_hash
from datetime import datetime, timedelta

def init_database():
    """Initialize database tables and create sample data."""
    
    print("Initializing database...")
    
    # Create all tables
    try:
        Base.metadata.create_all(bind=engine)
        print("SUCCESS: Database tables created!")
    except Exception as e:
        print(f"ERROR creating tables: {e}")
        return False
    
    # Create session
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == "admin@hireai.com").first()
        if existing_admin:
            print("INFO: Database already initialized with sample data")
            return True
        
        print("Creating sample data...")
        
        # 1. Create Admin User
        admin_user = User(
            email="admin@hireai.com",
            full_name="Admin User",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        
        # 2. Create HR User
        hr_user = User(
            email="hr@hireai.com",
            full_name="HR Manager",
            hashed_password=get_password_hash("hr123"),
            role="hr",
            is_active=True
        )
        db.add(hr_user)
        
        # 3. Create Recruiter User
        recruiter_user = User(
            email="recruiter@hireai.com",
            full_name="Recruiter",
            hashed_password=get_password_hash("recruiter123"),
            role="recruiter",
            is_active=True
        )
        db.add(recruiter_user)
        
        db.commit()
        db.refresh(admin_user)
        
        # 4. Create Sample Jobs
        jobs_data = [
            {
                "title": "Senior Full Stack Developer",
                "department": "Engineering",
                "location": "Remote",
                "job_type": "Full-time",
                "description": "We're looking for an experienced Full Stack Developer to join our team.",
                "required_skills": ["React", "Node.js", "Python", "PostgreSQL", "AWS"],
                "preferred_skills": ["TypeScript", "Docker", "Kubernetes"],
                "min_experience": 5,
                "max_experience": 10,
                "min_salary": 100000,
                "max_salary": 150000,
                "status": "active"
            },
            {
                "title": "AI/ML Engineer",
                "department": "Data Science",
                "location": "San Francisco, CA",
                "job_type": "Full-time",
                "description": "Join our AI team to build cutting-edge machine learning solutions.",
                "required_skills": ["Python", "TensorFlow", "PyTorch", "Machine Learning"],
                "preferred_skills": ["NLP", "Computer Vision", "MLOps"],
                "min_experience": 3,
                "max_experience": 7,
                "min_salary": 120000,
                "max_salary": 180000,
                "status": "active"
            },
            {
                "title": "Frontend Developer",
                "department": "Engineering",
                "location": "New York, NY",
                "job_type": "Full-time",
                "description": "Create beautiful and responsive user interfaces.",
                "required_skills": ["React", "JavaScript", "CSS", "HTML"],
                "preferred_skills": ["TypeScript", "Next.js", "Tailwind CSS"],
                "min_experience": 2,
                "max_experience": 5,
                "min_salary": 80000,
                "max_salary": 120000,
                "status": "active"
            }
        ]
        
        for job_data in jobs_data:
            job = Job(
                **job_data,
                posted_by=admin_user.id,
                posted_date=datetime.utcnow()
            )
            db.add(job)
        
        # 5. Create AI Settings
        ai_settings = AISettings(
            gemini_api_key="",
            enable_skill_extraction=True,
            enable_resume_parsing=True,
            enable_candidate_scoring=True,
            enable_interview_insights=True,
            enable_success_prediction=True,
            enable_learning_paths=True,
            enable_team_compatibility=True,
            enable_cost_intelligence=True,
            enable_career_simulator=True,
            auto_screen_candidates=False,
            min_match_score=60.0,
            updated_at=datetime.utcnow()
        )
        db.add(ai_settings)
        
        db.commit()
        
        print("SUCCESS: Sample data created!")
        print("\n" + "="*60)
        print("DATABASE READY FOR PRODUCTION!")
        print("="*60)
        print("\nDefault Login Credentials:")
        print("-" * 60)
        print("Admin User:")
        print("   Email: admin@hireai.com")
        print("   Password: admin123")
        print("\nHR Manager:")
        print("   Email: hr@hireai.com")
        print("   Password: hr123")
        print("\nRecruiter:")
        print("   Email: recruiter@hireai.com")
        print("   Password: recruiter123")
        print("-" * 60)
        print("\nSample Data Created:")
        print("   - 3 Users (Admin, HR, Recruiter)")
        print("   - 3 Job Postings")
        print("   - AI Settings Configured")
        print("\nYour system is now FULLY FUNCTIONAL!")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"ERROR creating sample data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("AI HIRING SYSTEM - DATABASE INITIALIZATION")
    print("="*60 + "\n")
    
    success = init_database()
    
    if success:
        print("\nDatabase initialization completed successfully!")
        print("You can now start the server and use all features!")
        sys.exit(0)
    else:
        print("\nDatabase initialization failed!")
        print("Please check the errors above and try again.")
        sys.exit(1)
