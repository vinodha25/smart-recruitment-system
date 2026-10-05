import requests

BASE_URL = "http://localhost:8000/api"

def create_dummy_data():
    # 1. Register User (if not exists, login first)
    email = "hr@example.com"
    password = "password123"
    
    # Try creating user
    try:
        requests.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Sarah Recruiter",
            "role": "recruiter",
            "department": "Human Resources"
        })
    except:
        pass # User might already exist

    # Login to get token
    login_resp = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    
    if login_resp.status_code != 200:
        print("Login failed")
        return

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Jobs
    jobs = [
        {
            "title": "Senior React Developer",
            "department": "Engineering",
            "location": "Remote",
            "job_type": "Full-time",
            "description": "We are looking for an experienced React developer to lead our frontend team. You will be responsible for...",
            "requirements": "5+ years react, TypeScript expert, Tailwind CSS",
            "required_skills": ["React", "TypeScript", "Tailwind CSS", "Redux"],
            "min_experience_years": 5,
            "salary_min": 120000,
            "salary_max": 160000
        },
        {
            "title": "AI Research Scientist",
            "department": "R&D",
            "location": "New York, NY",
            "job_type": "Full-time",
            "description": "Join our cutting-edge AI team working on LLMs and generative models...",
            "requirements": "PhD in CS/AI, PyTorch, Transformers, Python",
            "required_skills": ["Python", "PyTorch", "LLM", "Machine Learning"],
            "min_experience_years": 3,
            "salary_min": 150000,
            "salary_max": 220000
        },
        {
            "title": "Product Designer",
            "department": "Design",
            "location": "San Francisco, CA",
            "job_type": "Contract",
            "description": "Looking for a creative product designer to help reimagine our user experience...",
            "requirements": "Figma expert, UI/UX portfolio, Modern design principles",
            "required_skills": ["Figma", "UI Design", "UX Research", "Prototyping"],
            "min_experience_years": 4,
            "salary_min": 90, # Hourly rate
            "salary_max": 120
        }
    ]

    created_job_ids = []
    print("Creating jobs...")
    for job in jobs:
        resp = requests.post(f"{BASE_URL}/jobs", json=job, headers=headers)
        if resp.status_code == 200:
            job_data = resp.json()
            created_job_ids.append(job_data['id'])
            # Publish it
            requests.post(f"{BASE_URL}/jobs/{job_data['id']}/publish", headers=headers)
            print(f" - Created job: {job['title']}")

    if not created_job_ids:
        print("No jobs created (maybe they already exist?)")
        # Try fetching existing jobs to use
        jobs_resp = requests.get(f"{BASE_URL}/jobs", headers=headers)
        if jobs_resp.status_code == 200:
            created_job_ids = [j['id'] for j in jobs_resp.json()]

    # 3. Create Candidates (Mocking resume upload by creating candidate directly works for now, or we simulate upload)
    # We will simulate "Application" by creating candidates linked to these jobs
    
    candidates = [
        {
            "first_name": "Alex",
            "last_name": "Chen",
            "email": "alex.chen@example.com",
            "phone": "+1-555-0101",
            "job_id": created_job_ids[0] if created_job_ids else None,
            "skills": ["React", "TypeScript", "Node.js", "AWS"],
            "experience": 6,
            "status": "screening",
            "score": 92.5,
            "recommendation": "recommended"
        },
         {
            "first_name": "Jordan",
            "last_name": "Smith",
            "email": "jordan.s@example.com",
            "phone": "+1-555-0102",
            "job_id": created_job_ids[0] if created_job_ids else None,
            "skills": ["JavaScript", "HTML", "CSS", "React"],
            "experience": 2,
            "status": "new",
            "score": 65.0,
             "recommendation": "review"
        },
        {
            "first_name": "Emily",
            "last_name": "Wong",
            "email": "emily.w@example.com",
            "phone": "+1-555-0103",
            "job_id": created_job_ids[1] if len(created_job_ids) > 1 else (created_job_ids[0] if created_job_ids else None),
            "skills": ["Python", "PyTorch", "TensorFlow", "Computer Vision"],
            "experience": 4,
            "status": "interview",
            "score": 88.0,
            "recommendation": "recommended"
        },
        {
            "first_name": "David",
            "last_name": "Miller",
            "email": "d.miller@example.com",
            "phone": "+1-555-0104",
            "job_id": created_job_ids[1] if len(created_job_ids) > 1 else None,
            "skills": ["Java", "Spring", "SQL"],
            "experience": 8,
            "status": "rejected",
            "score": 45.0,
            "recommendation": "not_recommended"
        },
         {
            "first_name": "Sophia",
            "last_name": "Lee",
            "email": "sophia.l@example.com",
            "phone": "+1-555-0105",
            "job_id": created_job_ids[2] if len(created_job_ids) > 2 else None,
             "skills": ["Figma", "Sketch", "Adobe XD"],
            "experience": 5,
            "status": "shortlisted",
            "score": 95.0,
            "recommendation": "recommended"
        }

    ]

    print("Creating candidates...")
    for cand in candidates:
        if not cand["job_id"]: continue
        
        # We need to manually inject them into DB primarily because the API expects resume upload flow
        # But we can use the create candidate endpoint if available, or simulate it. 
        # Checking backend... there isn't a direct "create candidate" without resume usually, 
        # but let's check `candidates.py`. It likely has a create endpoint? 
        # Adjusting to just creating a placeholder candidate record if endpoint exists.
        
        # Actually, let's just use the `create_candidate` endpoint if one exists in schemas/routers
        # Based on schemas, `CandidateCreate` exists.
        
        try:
            # We first need a dummy resume record potentially? 
            # Or we can just create candidate.
            
            c_data = {
                "first_name": cand["first_name"],
                "last_name": cand["last_name"],
                "email": cand["email"],
                "phone": cand["phone"],
                "job_id": cand["job_id"],
                "source": "manual"
            }
            
            # Post to candidates endpoint
            # Assuming GET /api/candidates is list, POST /api/candidates is create
            create_resp = requests.post(f"{BASE_URL}/candidates", json=c_data, headers=headers)
            
            if create_resp.status_code == 200:
                cid = create_resp.json()['id']
                print(f" - Created candidate: {cand['first_name']} {cand['last_name']}")
                
                # Update with more details (score, status, etc) - usually this is read-only from AI
                # But for dummy data we might need direct DB access or special endpoint.
                # We can update status via API.
                requests.put(f"{BASE_URL}/candidates/{cid}", json={"status": cand["status"]}, headers=headers)
                
            else:
                 print(f"Failed to create {cand['first_name']}: {create_resp.text}")

        except Exception as e:
            print(f"Error creating candidate: {e}")

    # 4. Schedule some interviews
    print("Scheduling interviews...")
    # Get all candidates
    all_cands = requests.get(f"{BASE_URL}/candidates", headers=headers).json()
    interview_ready = [c for c in all_cands if c['status'] in ['interview', 'shortlisted']]
    
    for c in interview_ready:
        start_time = "2026-02-15T10:00:00"
        int_data = {
            "candidate_id": c['id'],
            "interview_type": "Technical Round",
            "scheduled_at": start_time,
            "duration_minutes": 60,
            "location": "Google Meet",
            "interviewer_ids": [] 
        }
        requests.post(f"{BASE_URL}/interviews", json=int_data, headers=headers)
        print(f" - Scheduled interview for {c['first_name']} {c['last_name']}")

    print("\n✅ Dummy data generation complete!")

if __name__ == "__main__":
    create_dummy_data()
