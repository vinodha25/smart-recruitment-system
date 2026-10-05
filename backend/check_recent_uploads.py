from app.database import SessionLocal
from app import models

db = SessionLocal()
candidates = db.query(models.Candidate).order_by(models.Candidate.applied_at.desc()).limit(5).all()

print(f"{'ID':<5} {'Name':<20} {'Job ID':<10} {'Job Title':<20} {'Created At'}")
print("-" * 70)
for c in candidates:
    job_title = c.job.title if c.job else "General Pool"
    print(f"{c.id:<5} {c.first_name} {c.last_name:<10} {c.job_id or 'None':<10} {job_title:<20} {c.applied_at}")

db.close()
