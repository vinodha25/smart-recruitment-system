# 🚀 HireAI Recruitment Workflow

This document outlines the end-to-end recruitment process implemented in the HireAI system, combining ATS, NLP, and AI capabilities.

## 1️⃣ HR POSTS A JOB (ATS)
**Goal:** Define the role and requirements.
- **Action:** HR creates a job with:
  - Job title
  - Description
  - Required & preferred skills
  - Experience range
- **State:** 
  - ❌ No resumes are checked yet
  - ❌ No one is rejected yet

## 2️⃣ CANDIDATES ARE ADDED (ATS + NLP)
**Goal:** Ingest applications and extract data.
- **Action:** Candidates apply or are added manually.
- **System Process:**
  - Resume is linked to the specific job.
  - **NLP Engine** automatically extracts:
    - 🛠 Skills
    - 📅 Experience Years
    - 🎓 Education
- **Status:** Everyone starts in **Applied** status.

## 3️⃣ HR ENTERS SCREENING MODE (HR ACTION)
**Goal:** Configure evaluation criteria.
- **Action:** HR selects a job and navigates to the **Screening** page.
- **Configuration:** HR can refine:
  - Mandatory skills
  - Optional skills
  - Minimum experience thresholds
  - Custom screening rules (e.g., "Exclude candidates without Python")

## 4️⃣ SYSTEM SCREENS CANDIDATES (NLP + RULES)
**Goal:** Objective evaluation.
- **Action:** System evaluates each candidate against the job configuration.
- **Calculations:**
  - Skill Match Score (Weighted)
  - Experience Match Score
  - **Overall Match %**
- **Outcome:** No decision is made yet, only scoring and sorting.

## 5️⃣ AI EXPLAINS RESULTS (AI SUPPORT)
**Goal:** Provide context behind the scores.
- **Action:** AI analyzes the profile and generates:
  - 📝 **Explanation:** Why they scored high/low
  - 💪 **Strengths:** Key assets
  - ⚠️ **Gaps:** Missing requirements
  - 💡 **Recommendation:** (e.g., "Proceed to interview")
- **Philosophy:** AI advises, HR decides.

## 6️⃣ HR MAKES FINAL DECISION (ATS)
**Goal:** Move the pipeline forward.
- **Action:** HR reviews the AI insights and scores.
- **Decision:**
  - ✅ **Shortlist** -> Move to Interview stage
  - ❌ **Reject** -> Send rejection email
  - 📅 **Interview** -> Schedule meeting
- **Status Update:** `Applied` → `Screened` → `Shortlisted`/`Rejected`

## 7️⃣ ADVANCED AI INSIGHTS (POST-SCREENING)
**Goal:** Deep dive for finalists.
- **Features:**
  - 📚 **Learning Paths:** Recommend courses to close skill gaps.
  - 🤝 **Team Compatibility:** Analyze fit with existing team dynamic.
  - 🔮 **Success Prediction:** Forecast long-term retention and performance.
  - 📈 **Career Simulator:** Visualize candidate's future growth.
