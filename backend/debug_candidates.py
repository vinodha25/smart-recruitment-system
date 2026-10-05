import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models, schemas
from app.database import Base, engine

# Ensure we can import app
sys.path.append(os.getcwd())

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("Fetching candidates...")
candidates = db.query(models.Candidate).all()
print(f"Found {len(candidates)} candidates in DB.")

for i, c in enumerate(candidates):
    print(f"Checking candidate {c.id}: {c.first_name} {c.last_name}")
    try:
        # Manually validate against schema
        data = schemas.CandidateResponse.model_validate(c)
        print(f"  OK")
    except Exception as e:
        print(f"  FAILED validation: {e}")
        # Print the raw values causing trouble
        print(f"  Raw values:")
        print(f"    status: {c.status} ({type(c.status)})")
        print(f"    job_id: {c.job_id}")
        print(f"    email: {c.email}")
        print(f"    applied_at: {c.applied_at}")
