"""Main application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db

from .routers import (
    auth,
    candidates,
    jobs,
    resumes,
    screening,
    interviews,
    decisions,
    hr_rules,
    ai_config,
    ai_insights
)
from .config import settings
import os

# Create upload directories
os.makedirs("uploads/resumes", exist_ok=True)

# Initialize database (optional - will work without DB for API docs)
try:
    init_db()
    print("Database initialized successfully")
except Exception as e:
    print(f"Warning: Could not connect to database: {e}")
    print("API will start but database operations will fail")
    print("To fix: Install MySQL or switch to SQLite")

# Trigger reload check



# Create FastAPI app
app = FastAPI(
    title="AI Hiring System API",
    description="Backend API for AI-powered Recruitment System",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(candidates.router)
app.include_router(screening.router)
app.include_router(interviews.router)
app.include_router(hr_rules.router)
app.include_router(decisions.router)
app.include_router(ai_config.router)
app.include_router(ai_insights.router)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "AI Hiring System API is running",
        "docs_url": "/docs",
        "version": "1.0.0"
    }

@app.post("/api/system/clear-data")
async def clear_data():
    """Clear all application data (demo reset)."""
    from .database import SessionLocal
    from . import models
    import shutil
    
    db = SessionLocal()
    try:
        # Delete in order of dependencies
        db.query(models.HiringDecision).delete()
        db.query(models.Interview).delete()
        db.query(models.SuccessPrediction).delete()
        db.query(models.TeamCompatibility).delete()
        db.query(models.LearningPath).delete()
        db.query(models.Candidate).delete()
        db.query(models.HRRule).delete()
        db.query(models.HiringCost).delete()
        db.query(models.Job).delete()
        
        db.commit()
        
        # Clear uploads
        upload_dir = "uploads/resumes"
        if os.path.exists(upload_dir):
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.is_dir(file_path):
                        shutil.rmtree(file_path)
                except Exception:
                    pass
                    
        return {"message": "Database and uploads cleared successfully"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
