import os
import sys

# Add backend directory to sys.path so app imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning) 

client = TestClient(app)

def test_decisions():
    from app.services.auth_service import get_current_user, require_hr
    
    db = SessionLocal()
    candidate = db.query(models.Candidate).first()
    if not candidate:
        job = models.Job(title="Software Engineer")
        db.add(job)
        db.commit()
        db.refresh(job)
        candidate = models.Candidate(
            first_name="Mock", last_name="Candidate", email="mock@example.com",
            job_id=job.id, status=models.CandidateStatus.NEW
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        
    candidate_id = candidate.id
    
    # Cleanup
    db.query(models.HiringDecision).filter(models.HiringDecision.candidate_id == candidate_id).delete()
    db.query(models.Interview).filter(models.Interview.candidate_id == candidate_id).delete()
    db.commit()
    
    mock_user = models.User(id=999, email="hr@test.com", role=models.UserRole.HR)
    
    app.dependency_overrides[require_hr] = lambda: mock_user
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    print("Testing Accept...")
    response = client.post("/api/decisions", json={"candidate_id": candidate_id, "decision": "accept", "reason": "Testing accept email"})
    print("Accept Status Code:", response.status_code)
    
    db.query(models.HiringDecision).filter(models.HiringDecision.candidate_id == candidate_id).delete()
    db.commit()

    print("\nTesting Hold...")
    response = client.post("/api/decisions", json={"candidate_id": candidate_id, "decision": "hold", "reason": "Testing interview schedule"})
    print("Hold Status Code:", response.status_code)
    
    db.query(models.HiringDecision).filter(models.HiringDecision.candidate_id == candidate_id).delete()
    db.commit()
    
    print("\nTesting Reject...")
    response = client.post("/api/decisions", json={"candidate_id": candidate_id, "decision": "reject", "reason": "Testing skill gaps UI"})
    print("Reject Status Code:", response.status_code)
    
    db.close()

if __name__ == "__main__":
    test_decisions()
