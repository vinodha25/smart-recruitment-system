from app.database import SessionLocal
from app import models
import os

db = SessionLocal()
print(f"{'ID':<5} {'Name':<20} {'Job ID':<10} {'Path':<50} {'Created At'}")
print("-" * 100)

candidates = db.query(models.Candidate).all()
# Sort manually to be sure
candidates.sort(key=lambda x: x.applied_at, reverse=True)

for c in candidates[:10]:
    path_exists = "YES" if c.resume_file_path and os.path.exists(c.resume_file_path) else "NO"
    path_str = c.resume_file_path[-40:] if c.resume_file_path else "None"
    print(f"{c.id:<5} {c.first_name} {c.last_name:<10} {c.job_id or 'None':<10} ...{path_str:<40} {c.applied_at} (File Exists: {path_exists})")

db.close()
