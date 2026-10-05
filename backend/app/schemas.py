"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# ============ Enums ============

class UserRoleEnum(str, Enum):
    ADMIN = "admin"
    HR = "hr"
    RECRUITER = "recruiter"
    INTERVIEWER = "interviewer"


class CandidateStatusEnum(str, Enum):
    NEW = "new"
    SCREENING = "screening"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    OFFERED = "offered"
    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class JobStatusEnum(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    FILLED = "filled"


# ============ User Schemas ============

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRoleEnum = UserRoleEnum.RECRUITER
    department: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None


# ============ Job Schemas ============

class JobBase(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    required_skills: Optional[List[str]] = []
    preferred_skills: Optional[List[str]] = []
    min_experience_years: Optional[int] = 0
    max_experience_years: Optional[int] = 0
    education_requirement: Optional[str] = None
    min_education: Optional[str] = "Bachelor's"
    work_mode: Optional[str] = "Office"
    role_level: Optional[str] = "Junior"
    num_openings: Optional[int] = 1
    key_responsibilities: Optional[List[str]] = []
    preferred_qualifications: Optional[List[str]] = []


class JobCreate(JobBase):
    deadline: Optional[datetime] = None


class JobUpdate(JobBase):
    title: Optional[str] = None
    status: Optional[JobStatusEnum] = None
    deadline: Optional[datetime] = None


class JobResponse(JobBase):
    id: int
    status: JobStatusEnum
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    deadline: Optional[datetime]
    candidate_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


# ============ Candidate Schemas ============

class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None


class CandidateCreate(CandidateBase):
    job_id: int
    source: Optional[str] = "manual"


class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    status: Optional[CandidateStatusEnum] = None
    job_id: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class ScreeningRequest(BaseModel):
    job_id: Optional[int] = None


class ScreeningResult(BaseModel):
    overall_score: float
    skill_match_score: float
    experience_match_score: float
    education_match_score: float
    ai_recommendation: str
    ai_insight: str
    extracted_skills: List[str]


class CandidateResponse(CandidateBase):
    id: int
    job_id: Optional[int] = None
    email: Optional[str] = None
    status: Optional[str] = None
    extracted_skills: Optional[List[str]] = []
    overall_score: Optional[float] = None
    skill_match_score: Optional[float] = None
    experience_match_score: Optional[float] = None
    education_match_score: Optional[float] = None
    responsibility_match_score: Optional[float] = None
    preferred_match_score: Optional[float] = None
    bonus_score: Optional[float] = None
    ats_score: Optional[float] = None
    ats_breakdown: Optional[dict] = None
    ai_recommendation: Optional[str] = None
    ai_insight: Optional[str] = None
    ai_analysis_json: Optional[Any] = None
    source: Optional[str] = None
    recruiter_name: Optional[str] = None
    position: Optional[str] = None
    intern_experience_years: Optional[float] = 0.0
    work_experience_years: Optional[float] = 0.0
    success_prediction_score: Optional[float] = None
    applied_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CandidateDetail(CandidateResponse):
    resume_text: Optional[str] = None
    experience_years: Optional[float] = None
    intern_experience_years: Optional[float] = 0.0
    work_experience_years: Optional[float] = 0.0
    education: Optional[List[Any]] = []
    work_history: Optional[List[Any]] = []
    internship_history: Optional[List[Any]] = []
    success_prediction_score: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    ats_breakdown: Optional[dict] = None


# ============ Interview Schemas ============

class InterviewBase(BaseModel):
    interview_type: str
    scheduled_at: datetime
    duration_minutes: int = 60
    location: Optional[str] = None
    interviewer_ids: Optional[List[int]] = []


class InterviewCreate(InterviewBase):
    candidate_id: int


class InterviewUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    cultural_fit_score: Optional[float] = None


class InterviewResponse(InterviewBase):
    id: int
    candidate_id: int
    status: str
    feedback: Optional[str] = None
    rating: Optional[float] = None
    ai_summary: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ HR Rule Schemas ============

class HRRuleBase(BaseModel):
    rule_text: str
    rule_type: str = "filter"  # include, exclude, priority
    is_temporary: bool = True


class HRRuleCreate(HRRuleBase):
    job_id: Optional[int] = None


class HRRuleResponse(HRRuleBase):
    id: int
    job_id: Optional[int]
    extracted_keywords: Optional[List[str]] = []
    extracted_conditions: Optional[dict] = {}
    is_active: bool
    priority: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ Hiring Decision Schemas ============

class HiringDecisionCreate(BaseModel):
    candidate_id: int
    decision: str  # accept, reject, hold
    reason: Optional[str] = None
    override_reason: Optional[str] = None


class HiringDecisionResponse(BaseModel):
    id: int
    candidate_id: int
    decision: str
    reason: Optional[str] = None
    ai_recommendation: Optional[str] = None
    ai_explanation: Optional[str] = None
    system_score: Optional[float] = None
    hr_override: bool
    decided_by: int
    decided_at: datetime
    
    class Config:
        from_attributes = True


# ============ AI Module Schemas ============

class SkillGapAnalysis(BaseModel):
    skill_name: str
    current_level: int
    target_level: int
    gap: int
    priority: str


class LearningPathResponse(BaseModel):
    id: int
    candidate_id: int
    skill_name: str
    current_level: int
    target_level: int
    recommended_courses: List[dict]
    estimated_duration: str
    priority: str
    ai_explanation: Optional[str] = None
    
    class Config:
        from_attributes = True


class TeamCompatibilityResponse(BaseModel):
    id: int
    candidate_id: int
    team_id: str
    overall_compatibility: float
    communication_style_match: float
    work_style_match: float
    skills_complement: float
    strengths: List[str]
    potential_challenges: List[str]
    ai_recommendation: Optional[str] = None
    
    class Config:
        from_attributes = True


class SuccessPredictionResponse(BaseModel):
    id: int
    candidate_id: int
    success_score: float
    retention_probability: float
    performance_prediction: str
    time_to_productivity: str
    positive_factors: List[str]
    risk_factors: List[str]
    ai_explanation: Optional[str] = None
    confidence_level: float
    
    class Config:
        from_attributes = True


class HiringCostResponse(BaseModel):
    id: int
    job_id: int
    total_cost: float
    sourcing_cost: float
    screening_cost: float
    interview_cost: float
    onboarding_cost: float
    time_to_hire_days: int
    time_to_fill_days: int
    estimated_first_year_value: float
    roi_prediction: float
    cost_optimization_tips: List[str]
    ai_analysis: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============ Resume Upload ============

class ResumeResponse(BaseModel):
    id: int
    file_path: str
    original_filename: str
    file_size: int
    status: str
    candidate_name: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[List[str]] = []
    match_score: Optional[float] = None
    ai_analysis_json: Optional[Any] = None
    ai_insight: Optional[str] = None
    has_internship: Optional[bool] = False
    internship_details: Optional[List[str]] = []
    experience_years: Optional[float] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    recruiter_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ResumeUploadResponse(BaseModel):
    candidate_id: int
    extracted_text: str
    extracted_skills: List[str]
    experience_years: float
    message: str


# ============ AI Explanation Request ============

class AIExplanationRequest(BaseModel):
    candidate_id: int
    context: Optional[str] = None


class AIExplanationResponse(BaseModel):
    candidate_id: int
    explanation: str
    recommendation: str
    key_factors: List[str]
    confidence_score: float


# ============ Dashboard Stats ============

class DashboardStats(BaseModel):
    total_candidates: int
    open_positions: int
    interviews_this_week: int
    avg_time_to_hire: int
    recommended_candidates: int
    pending_review: int
    recent_insights: List[dict]

# ============ AI Configuration Schemas ============

class AISettingsBase(BaseModel):
    provider: str = "Gemini"
    api_model: str = "gemini-1.5-flash"
    enable_skill_explanation: bool = True
    enable_learning_recommendation: bool = True
    enable_post_hire_prediction: bool = True
    enable_team_compatibility: bool = True
    enable_career_simulation: bool = False
    temperature: float = 0.7
    max_tokens: int = 2048

class AISettingsCreate(AISettingsBase):
    api_key: str

class AISettingsUpdate(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    api_model: Optional[str] = None
    enable_skill_explanation: Optional[bool] = None
    enable_learning_recommendation: Optional[bool] = None
    enable_post_hire_prediction: Optional[bool] = None
    enable_team_compatibility: Optional[bool] = None
    enable_career_simulation: Optional[bool] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

class AISettingsResponse(AISettingsBase):
    id: int
    api_key: str = Field(..., description="Masked API key")
    updated_at: datetime
    
    class Config:
        from_attributes = True

    @staticmethod
    def mask_key(key: str) -> str:
        if not key or len(key) < 8:
            return "********"
        return f"{key[:4]}...{key[-4:]}"


class CostIntelligenceResponse(BaseModel):
    success: bool
    estimated_salary: Optional[float] = None
    total_investment: Optional[float] = None
    roi_level: Optional[str] = None
    value_classification: Optional[str] = None
    cost_tips: Optional[List[str]] = []
    ai_analysis: Optional[str] = None
