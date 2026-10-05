from app.database import SessionLocal
from app import models
import os
from datetime import datetime

db = SessionLocal()
print(f"{'ID':<5} {'Name':<25} {'Job ID':<8} {'Status':<15} {'Applied At':<25} {'Resume Path'}")
print("-" * 120)

# Get the last 10 candidates by ID
candidates = db.query(models.Candidate).order_by(models.Candidate.id.desc()).limit(10).all()

for c in candidates:
    name = f"{c.first_name} {c.last_name}"
    applied_at = c.applied_at.strftime("%Y-%m-%d %H:%M:%S") if c.applied_at else "N/A"
    resume_path = os.path.basename(c.resume_file_path) if c.resume_file_path else "No Path"
    print(f"{c.id:<5} {name:<25} {str(c.job_id):<8} {c.status:<15} {applied_at:<25} {resume_path}")

db.close()
