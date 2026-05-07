from app.database import SessionLocal
from app import models
import os
import shutil

# Database path is hiring_system.db in backend folder
def clear_data():
    db = SessionLocal()
    try:
        print("Clearing database tables...")
        # Order matters due to foreign keys
        db.query(models.Interview).delete()
        db.query(models.LearningPath).delete()
        db.query(models.HiringDecision).delete()
        db.query(models.HRRule).delete()
        db.query(models.Candidate).delete()
        db.query(models.Job).delete()
        # Note: We keep the User table so you don't lose your login
        db.commit()
        print("Database cleared successfully.")
    except Exception as e:
        print(f"Error clearing database: {e}")
        db.rollback()
    finally:
        db.close()

def clear_uploads():
    upload_dir = "uploads"
    if os.path.exists(upload_dir):
        print(f"Clearing uploads directory: {upload_dir}")
        for filename in os.listdir(upload_dir):
            file_path = os.path.join(upload_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f'Failed to delete {file_path}. Reason: {e}')
        print("Uploads directory cleared.")
    else:
        print("Uploads directory not found.")

if __name__ == "__main__":
    clear_data()
    clear_uploads()
