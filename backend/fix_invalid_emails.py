from app.database import SessionLocal
from app import models
import re

def fix_emails():
    db = SessionLocal()
    try:
        # Fetch all candidates
        candidates = db.query(models.Candidate).all()
        fixed_count = 0
        
        for candidate in candidates:
            if candidate.email and ('(' in candidate.email or ')' in candidate.email):
                old_email = candidate.email
                # Remove parentheses
                new_email = candidate.email.replace('(', '').replace(')', '')
                candidate.email = new_email
                print(f"Fixing email: {old_email} -> {new_email}")
                fixed_count += 1
        
        if fixed_count > 0:
            db.commit()
            print(f"Successfully fixed {fixed_count} invalid emails.")
        else:
            print("No invalid emails found.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_emails()
