"""Database models for the AI Hiring System."""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base


class UserRole(str, enum.Enum):
    """User roles in the system."""
    ADMIN = "admin"
    HR = "hr"
    RECRUITER = "recruiter"
    INTERVIEWER = "interviewer"


class CandidateStatus(str, enum.Enum):
    """Candidate status in hiring pipeline."""
    NEW = "new"
    SCREENING = "screening"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    OFFERED = "offered"
    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class JobStatus(str, enum.Enum):
    """Job posting status."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    FILLED = "filled"


class InterviewStatus(str, enum.Enum):
    """Interview status."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


# ============ User Management ============

class User(Base):
    """User model for authentication and authorization."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.RECRUITER)
    department = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    jobs_created = relationship("Job", back_populates="created_by_user")
    decisions = relationship("HiringDecision", back_populates="decided_by_user")


# ============ Job Management ============

class Job(Base):
    """Job posting model."""
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    department = Column(String(100))
    location = Column(String(255))
    job_type = Column(String(50))  # full-time, part-time, contract
    experience_level = Column(String(50))  # entry, mid, senior
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    description = Column(Text)
    requirements = Column(Text)
    required_skills = Column(JSON)  # List of required skills
    preferred_skills = Column(JSON)  # List of preferred skills
    min_experience_years = Column(Integer, default=0)
    max_experience_years = Column(Integer, default=0)
    education_requirement = Column(String(100))
    min_education = Column(String(100)) # Diploma, Bachelor's, Master's, Any
    work_mode = Column(String(50)) # On-site, Hybrid, Remote
    role_level = Column(String(50)) # Intern, Junior, Mid, Senior, Lead
    num_openings = Column(Integer, default=1)
    key_responsibilities = Column(JSON) # List of strings
    preferred_qualifications = Column(JSON) # List of strings
    status = Column(Enum(JobStatus), default=JobStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deadline = Column(DateTime)
    
    # Relationships
    created_by_user = relationship("User", back_populates="jobs_created")
    candidates = relationship("Candidate", back_populates="job")


# ============ Candidate & Resume Management ============

class Candidate(Base):
    """Candidate model storing applicant information."""
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    
    # Personal Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20))
    location = Column(String(255))
    
    # Resume & Skills
    resume_file_path = Column(String(500))
    resume_text = Column(Text)  # Extracted text from resume
    extracted_skills = Column(JSON)  # Skills extracted via NLP
    experience_years = Column(Float)
    intern_experience_years = Column(Float, default=0.0)
    work_experience_years = Column(Float, default=0.0)
    education = Column(JSON)  # List of education details
    work_history = Column(JSON)  # List of work experiences
    internship_history = Column(JSON)  # List of internship details
    
    # Screening Results
    overall_score = Column(Float)
    skill_match_score = Column(Float)
    experience_match_score = Column(Float)
    education_match_score = Column(Float)
    responsibility_match_score = Column(Float)
    preferred_match_score = Column(Float)
    bonus_score = Column(Float)
    ats_score = Column(Float)
    ats_breakdown = Column(JSON)
    
    # AI Insights
    ai_recommendation = Column(String(50))  # recommended, review, not_recommended
    ai_insight = Column(Text)
    ai_analysis_json = Column(JSON)  # Structured analysis (strengths, weaknesses, risks, rewards)
    success_prediction_score = Column(Float)
    
    # Status & Tracking
    status = Column(Enum(CandidateStatus), default=CandidateStatus.NEW)
    source = Column(String(100))  # google_form, manual, referral, etc.
    recruiter_name = Column(String(100)) # Name of HR/Recruiter handling this candidate
    notes = Column(Text)
    tags = Column(JSON)
    
    # Timestamps
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="candidates")
    interviews = relationship("Interview", back_populates="candidate")

    @property
    def position(self):
        return self.job.title if self.job else "General Application"
    decision = relationship("HiringDecision", back_populates="candidate", uselist=False)
    learning_paths = relationship("LearningPath", back_populates="candidate")


# ============ Interview Management ============

class Interview(Base):
    """Interview scheduling and tracking model."""
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    
    # Interview Details
    interview_type = Column(String(50))  # phone, video, technical, hr, final
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    location = Column(String(255))  # Physical location or video link
    
    # Interviewers
    interviewer_ids = Column(JSON)  # List of user IDs
    
    # Results
    status = Column(Enum(InterviewStatus), default=InterviewStatus.SCHEDULED)
    feedback = Column(Text)
    rating = Column(Float)  # 1-5 scale
    technical_score = Column(Float)
    communication_score = Column(Float)
    cultural_fit_score = Column(Float)
    
    # AI Analysis
    ai_summary = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    candidate = relationship("Candidate", back_populates="interviews")


# ============ HR Rules ============

class HRRule(Base):
    """HR-defined filtering rules for candidate screening."""
    __tablename__ = "hr_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)  # null = applies to all jobs
    
    # Rule Definition
    rule_text = Column(Text, nullable=False)  # Natural language rule from HR
    rule_type = Column(String(50))  # include, exclude, priority
    extracted_keywords = Column(JSON)  # Keywords extracted from rule
    extracted_conditions = Column(JSON)  # Structured conditions
    
    # Application
    is_active = Column(Boolean, default=True)
    is_temporary = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)


# ============ Final Hiring Decision ============

class HiringDecision(Base):
    """Final hiring decision made by HR."""
    __tablename__ = "hiring_decisions"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), unique=True)
    
    # Decision
    decision = Column(String(20), nullable=False)  # accept, reject, hold
    reason = Column(Text)
    
    # AI Context (for transparency)
    ai_recommendation = Column(String(50))
    ai_explanation = Column(Text)
    system_score = Column(Float)
    
    # HR Override Info
    hr_override = Column(Boolean, default=False)
    override_reason = Column(Text)
    
    # Metadata
    decided_by = Column(Integer, ForeignKey("users.id"))
    decided_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    candidate = relationship("Candidate", back_populates="decision")
    decided_by_user = relationship("User", back_populates="decisions")


# ============ AI Modules Data ============

class LearningPath(Base):
    """AI-generated learning paths for candidates with skill gaps."""
    __tablename__ = "learning_paths"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    
    # Skill Gap Analysis
    skill_name = Column(String(100), nullable=False)
    current_level = Column(Integer)  # 0-100
    target_level = Column(Integer)  # 0-100
    
    # Learning Recommendations
    recommended_courses = Column(JSON)  # List of course recommendations
    estimated_duration = Column(String(50))
    priority = Column(String(20))  # high, medium, low
    
    # AI Generated
    ai_explanation = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    candidate = relationship("Candidate", back_populates="learning_paths")


class TeamCompatibility(Base):
    """Team compatibility analysis results."""
    __tablename__ = "team_compatibility"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    team_id = Column(String(100))  # Department or team identifier
    
    # Compatibility Scores
    overall_compatibility = Column(Float)
    communication_style_match = Column(Float)
    work_style_match = Column(Float)
    skills_complement = Column(Float)
    
    # AI Analysis
    strengths = Column(JSON)
    potential_challenges = Column(JSON)
    ai_recommendation = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class SuccessPrediction(Base):
    """Post-hire success prediction analysis."""
    __tablename__ = "success_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    
    # Prediction Scores
    success_score = Column(Float)  # 0-100
    retention_probability = Column(Float)  # 0-1
    performance_prediction = Column(String(20))  # low, medium, high, exceptional
    time_to_productivity = Column(String(50))  # Estimated time to full productivity
    
    # Factors
    positive_factors = Column(JSON)
    risk_factors = Column(JSON)
    
    # AI Analysis
    ai_explanation = Column(Text)
    confidence_level = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class HiringCost(Base):
    """Hiring cost intelligence data."""
    __tablename__ = "hiring_costs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    
    # Cost Tracking
    total_cost = Column(Float)
    sourcing_cost = Column(Float)
    screening_cost = Column(Float)
    interview_cost = Column(Float)
    onboarding_cost = Column(Float)
    
    # Time Tracking
    time_to_hire_days = Column(Integer)
    time_to_fill_days = Column(Integer)
    
    # ROI Analysis
    estimated_first_year_value = Column(Float)
    roi_prediction = Column(Float)
    
    # AI Insights
    cost_optimization_tips = Column(JSON)
    ai_analysis = Column(Text)
    
    calculated_at = Column(DateTime, default=datetime.utcnow)

class AISettings(Base):
    """Configuration settings for AI modules."""
    __tablename__ = "ai_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), default="Gemini")
    api_key = Column(String(255))
    api_model = Column(String(50), default="gemini-1.5-flash")
    
    # Module Toggles
    enable_skill_explanation = Column(Boolean, default=True)
    enable_learning_recommendation = Column(Boolean, default=True)
    enable_post_hire_prediction = Column(Boolean, default=True)
    enable_team_compatibility = Column(Boolean, default=True)
    enable_career_simulation = Column(Boolean, default=False)
    
    # Parameters
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2048)
    
    # Metadata
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
