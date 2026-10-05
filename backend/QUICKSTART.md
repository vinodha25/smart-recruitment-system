# 🎯 Quick Start Guide

## 1️⃣ Install MySQL (if not installed)

**Windows:**
- Download from: https://dev.mysql.com/downloads/installer/
- Install MySQL Server 8.0+
- Set root password during installation

**Verify Installation:**
```bash
mysql --version
```

## 2️⃣ Backend Setup (5 Minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux

# Edit .env and update MySQL password
# DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/hiring_system
```

## 3️⃣ Initialize Database

```bash
python setup_database.py
```

**Expected Output:**
```
🚀 Starting database setup...
✅ Database 'hiring_system' created/verified
✅ All tables created successfully
✅ Sample data seeded successfully

📧 Login Credentials:
   Admin: admin@hiring.com / admin123
   HR:    hr@hiring.com / hr123

✅ Database setup complete!
```

## 4️⃣ Start Backend Server

```bash
uvicorn app.main:app --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## 5️⃣ Test the API

Open browser: **http://localhost:8000/docs**

You should see the Swagger UI with all API endpoints!

## 6️⃣ Test with Postman

1. Import `postman_collection.json` into Postman
2. Create environment variable: `base_url = http://localhost:8000`
3. Run "Login" request first (it will auto-save the token)
4. Try other requests

## 7️⃣ Frontend Setup (Optional)

```bash
# In project root (not backend folder)
cd ..

# Install dependencies
npm install

# Start frontend
npm run dev
```

Frontend will run on: **http://localhost:5173**

---

## 🧪 Quick Test Flow

### Test 1: Create a Job
```bash
POST http://localhost:8000/api/jobs
Authorization: Bearer <token>

{
  "title": "React Developer",
  "required_skills": ["React", "JavaScript"],
  "min_experience_years": 2
}
```

### Test 2: Add Candidate
```bash
POST http://localhost:8000/api/candidates

{
  "job_id": 1,
  "first_name": "Test",
  "last_name": "User",
  "email": "test@example.com"
}
```

### Test 3: Screen Candidate
```bash
POST http://localhost:8000/api/candidates/1/screen
```

### Test 4: Create HR Rule
```bash
POST http://localhost:8000/api/hr-rules

{
  "rule_text": "Only React developers with 3+ years",
  "job_id": 1
}
```

### Test 5: Make Decision
```bash
POST http://localhost:8000/api/decisions

{
  "candidate_id": 1,
  "decision": "accept",
  "reason": "Good fit"
}
```

---

## 🐛 Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"
**Fix:** Update DATABASE_URL in `.env` with correct MySQL password

### Error: "No module named 'app'"
**Fix:** Make sure you're in the `backend` folder and virtual environment is activated

### Error: "Port 8000 is already in use"
**Fix:** Kill the process or change port:
```bash
uvicorn app.main:app --reload --port 8001
```

### Error: "Can't connect to MySQL server"
**Fix:** Start MySQL service:
```bash
# Windows
net start MySQL80

# Mac
brew services start mysql

# Linux
sudo systemctl start mysql
```

---

## 📊 Database Schema (ER Diagram)

```
USER (HR/Admin)
  ↓ creates
JOB
  ↓ has many
CANDIDATE
  ↓ has
RESUME + SCREENING_RESULT + AI_OUTPUT

HR_RULE ← created by HR
AI_CONFIG ← controls AI modules
```

---

## 🎓 For College Project Demo

### What to Show:

1. **Swagger UI** - Show all APIs documented
2. **Postman** - Demonstrate API testing
3. **Database** - Show tables in MySQL Workbench
4. **HR Rule** - Create rule in natural language
5. **AI Toggle** - Show AI can be disabled
6. **Decision Flow** - Show HR makes final call, not AI

### One-Line Explanation:

> "The system uses FastAPI for backend, MySQL for database, NLP for skill extraction, and Gemini AI only for optional insights—with all final hiring decisions controlled by HR."

---

## ✅ Success Checklist

- [ ] MySQL installed and running
- [ ] Virtual environment activated
- [ ] Dependencies installed
- [ ] Database initialized
- [ ] Server running on port 8000
- [ ] Swagger UI accessible
- [ ] Postman collection imported
- [ ] Login successful
- [ ] Sample job created
- [ ] Sample candidate added

---

## 🚀 Next Steps

1. ✅ Backend is ready
2. Connect frontend to backend
3. Add Gemini API key (optional)
4. Test full workflow
5. Deploy to cloud (optional)

**You're all set! 🎉**
