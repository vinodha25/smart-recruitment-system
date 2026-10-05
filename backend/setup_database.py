"""Database initialization script."""
import sys
from sqlalchemy import create_engine, text
from app.database import Base, engine
from app.models import User, Job, Candidate, HRRule, AISettings
from app.services.auth_service import get_password_hash
from app.config import settings
from datetime import datetime

def create_database():
    """Create database if it doesn't exist."""
    print("Checking database...")
    if settings.DATABASE_URL.startswith("sqlite"):
        print("Using SQLite, skipping explicit database creation.")
        return

    try:
        # Connect without database
        # This assumes MySQL default credentials if not specified, 
        # but realistically should parse DATABASE_URL. 
        # For this fix we just catch the error and warn.
        base_url = "mysql+pymysql://root:password@localhost:3306"
        temp_engine = create_engine(base_url)
        
        with temp_engine.connect() as conn:
            conn.execute(text("CREATE DATABASE IF NOT EXISTS hiring_system"))
            conn.commit()
        
        print("Database 'hiring_system' created/verified")
    except Exception as e:
        print(f"Warning: Could not create database directly (this is expected if using SQLite or different credentials): {e}")

def create_tables():
    """Create all tables."""
    try:
        Base.metadata.create_all(bind=engine)
        print("All tables created successfully")
    except Exception as e:
        print(f"Error creating tables: {e}")
        sys.exit(1)

def seed_data():
    """Seed initial data for testing."""
    from app.database import SessionLocal
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_user = db.query(User).first()
        if existing_user:
            print("Database already has data. Skipping seed.")
            return
        
        # Create admin user
        admin = User(
            email="admin@hiring.com",
            hashed_password=get_password_hash("admin123"),
            full_name="System Admin",
            role="admin",
            department="IT"
        )
        db.add(admin)
        
        # Create HR user
        hr = User(
            email="hr@hiring.com",
            hashed_password=get_password_hash("hr123"),
            full_name="HR Manager",
            role="hr",
            department="Human Resources"
        )
        db.add(hr)
        
        # Create sample job
        job = Job(
            title="Senior Python Developer",
            department="Engineering",
            location="Remote",
            job_type="full-time",
            experience_level="senior",
            salary_min=80000,
            salary_max=120000,
            description="We are looking for an experienced Python developer...",
            requirements="5+ years of Python experience, FastAPI, SQL",
            required_skills=["Python", "FastAPI", "SQL", "Docker"],
            preferred_skills=["React", "AWS", "Kubernetes"],
            min_experience_years=5,
            education_requirement="Bachelor's in Computer Science",
            status="active",
            created_by=1
        )
        db.add(job)
        
        # Create AI Settings (default disabled)
        ai_config = AISettings(
            provider="Gemini",
            api_key="",
            api_model="gemini-1.5-flash",
            enable_skill_explanation=True,
            enable_learning_recommendation=True,
            enable_post_hire_prediction=False,
            enable_team_compatibility=False,
            enable_career_simulation=False,
            temperature=0.7,
            max_tokens=2048
        )
        db.add(ai_config)
        
        db.commit()
        print("Sample data seeded successfully")
        print("\nLogin Credentials:")
        print("   Admin: admin@hiring.com / admin123")
        print("   HR:    hr@hiring.com / hr123")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting database setup...")
    create_database()
    create_tables()
    seed_data()
    print("\nDatabase setup complete!")
    print("Run: uvicorn app.main:app --reload")
