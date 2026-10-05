"""Script to clear all demo data from the database (Non-interactive)."""
from app.database import SessionLocal, engine
from app.models import Candidate, Job, Interview, HiringDecision, HRRule, AISettings, User, SuccessPrediction, TeamCompatibility, LearningPath, HiringCost
from sqlalchemy import text
import os
import shutil

def clear_data():
    db = SessionLocal()
    try:
        print("Clearing database tables...")
        # Delete in order of dependencies (child to parent)
        db.query(HiringDecision).delete()
        db.query(Interview).delete()
        db.query(SuccessPrediction).delete()
        db.query(TeamCompatibility).delete()
        db.query(LearningPath).delete()
        db.query(Candidate).delete()
        db.query(HRRule).delete()
        db.query(HiringCost).delete()
        db.query(Job).delete()
        
        db.commit()
        print("Database cleared successfully.")
        
        # Clear uploads folder
        upload_dir = "uploads/resumes"
        if os.path.exists(upload_dir):
            print(f"Clearing uploads in {upload_dir}...")
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.is_dir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f'Failed to delete {file_path}. Reason: {e}')
            print("Uploads cleared.")
            
    except Exception as e:
        db.rollback()
        print(f"Error clearing data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_data()
