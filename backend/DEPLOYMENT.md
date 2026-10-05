# 🚀 AI Hiring System - Deployment Guide

## Prerequisites

- Python 3.9+
- MySQL 8.0+
- Git

## Step 1: Clone & Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

## Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and update:
# - DATABASE_URL (MySQL credentials)
# - SECRET_KEY (generate a secure key)
# - GEMINI_API_KEY (optional, for AI features)
```

## Step 4: Setup Database

```bash
# Make sure MySQL is running
# Then run:
python setup_database.py
```

This will:
- Create the `hiring_system` database
- Create all tables
- Seed sample data (admin user, HR user, sample job)

## Step 5: Run the Server

```bash
uvicorn app.main:app --reload
```

Server will start at: `http://localhost:8000`

## Step 6: Test the API

Open your browser and go to:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Default Login Credentials

| Role  | Email              | Password  |
|-------|-------------------|-----------|
| Admin | admin@hiring.com  | admin123  |
| HR    | hr@hiring.com     | hr123     |

## API Endpoints Overview

### 🔐 Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get token

### 💼 Jobs
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create new job
- `GET /api/jobs/{id}` - Get job details
- `PUT /api/jobs/{id}` - Update job
- `DELETE /api/jobs/{id}` - Delete job

### 👥 Candidates
- `GET /api/candidates` - List candidates
- `POST /api/candidates` - Add candidate manually
- `POST /api/candidates/upload-resume` - Upload resume
- `GET /api/candidates/{id}` - Get candidate details
- `PUT /api/candidates/{id}` - Update candidate
- `POST /api/candidates/{id}/screen` - Run screening

### 📊 Screening
- `GET /api/screening/results` - Get screening results
- `GET /api/screening/stats` - Get statistics
- `POST /api/screening/batch-screen` - Screen all candidates
- `POST /api/screening/apply-rules` - Apply HR rules

### 📝 HR Rules
- `GET /api/hr-rules` - List rules
- `POST /api/hr-rules` - Create rule
- `POST /api/hr-rules/{id}/toggle` - Enable/disable rule
- `POST /api/hr-rules/preview` - Preview rule impact

### ✅ Decisions
- `GET /api/decisions` - List decisions
- `POST /api/decisions` - Make hiring decision
- `GET /api/decisions/stats/summary` - Decision statistics

### 🤖 AI Insights (Optional - Requires Gemini API Key)
- `POST /api/ai/explain/{id}` - Generate explanation
- `POST /api/ai/learning-path/{id}` - Generate learning path
- `POST /api/ai/success-prediction/{id}` - Predict success
- `POST /api/ai/team-compatibility/{id}` - Analyze team fit
- `POST /api/ai/career-path/{id}` - Career simulation

### ⚙️ AI Configuration
- `GET /api/ai/config` - Get AI settings
- `PUT /api/ai/config` - Update AI settings

## Testing with Postman

1. Import the `postman_collection.json` file
2. Set environment variable `base_url` to `http://localhost:8000`
3. Login to get token
4. Token will auto-populate in subsequent requests

## Production Deployment

### Using Gunicorn (Linux)

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Using Docker

```bash
docker build -t hiring-system-backend .
docker run -p 8000:8000 hiring-system-backend
```

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### Import Errors
- Activate virtual environment
- Run `pip install -r requirements.txt`

### Port Already in Use
- Change PORT in .env
- Or kill process using port 8000

## Architecture Summary

```
Backend Flow:
Resume → ATS → NLP Extraction → Scoring → HR Rules → HR Decision
                                              ↓
                                         AI Insights (Optional)
```

**Key Points:**
- ✅ Backend NEVER auto-rejects
- ✅ AI is ONLY for insights, not decisions
- ✅ HR has full control via rules and manual decisions
- ✅ All AI modules can be toggled on/off

## Support

For issues, check:
1. Server logs in terminal
2. MySQL error logs
3. API documentation at /docs
