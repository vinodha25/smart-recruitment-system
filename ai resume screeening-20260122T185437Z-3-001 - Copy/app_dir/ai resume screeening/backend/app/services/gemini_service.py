"""Gemini AI Service for generating insights and explanations."""
import google.generativeai as genai
from typing import Dict, List, Optional
import json
from ..config import settings


class GeminiService:
    """Service for interacting with Google Gemini AI."""
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = None
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def _is_available(self) -> bool:
        """Check if Gemini API is available."""
        return self.model is not None and bool(self.api_key)
    
    async def generate_candidate_explanation(
        self,
        candidate_data: Dict,
        job_data: Dict,
        screening_result: Dict
    ) -> Dict:
        """
        Generate AI explanation for candidate screening result.
        
        Args:
            candidate_data: Candidate information
            job_data: Job requirements
            screening_result: Screening scores
            
        Returns:
            AI-generated explanation and insights
        """
        if not self._is_available():
            return self._fallback_explanation(candidate_data, job_data, screening_result)
        
        prompt = f"""
        As an AI hiring assistant, provide a clear and professional explanation for the following candidate screening result.
        
        **Job Position:** {job_data.get('title', 'Unknown Position')}
        **Required Skills:** {', '.join(job_data.get('required_skills', []))}
        **Minimum Experience:** {job_data.get('min_experience_years', 0)} years
        
        **Candidate:** {candidate_data.get('first_name', '')} {candidate_data.get('last_name', '')}
        **Skills:** {', '.join(candidate_data.get('extracted_skills', []))}
        **Experience:** {candidate_data.get('experience_years', 0)} years
        
        **Screening Scores:**
        - Overall Score: {screening_result.get('overall_score', 0)}%
        - Skill Match: {screening_result.get('skill_match_score', 0)}%
        - Experience Match: {screening_result.get('experience_match_score', 0)}%
        - Education Match: {screening_result.get('education_match_score', 0)}%
        
        **Recommendation:** {screening_result.get('ai_recommendation', 'Unknown')}
        
        Please provide:
        1. A 2-3 sentence explanation of why this candidate received this score
        2. Key strengths (2-3 bullet points)
        3. Areas of concern or gaps (if any)
        4. Recommendation for the hiring manager
        
        Keep the response concise and actionable. Format as JSON with keys: explanation, strengths, concerns, recommendation
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result_text = response.text
            
            # Try to parse as JSON
            try:
                # Clean up the response if needed
                if "```json" in result_text:
                    result_text = result_text.split("```json")[1].split("```")[0]
                elif "```" in result_text:
                    result_text = result_text.split("```")[1].split("```")[0]
                
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # If not valid JSON, create structured response from text
                result = {
                    "explanation": result_text[:500],
                    "strengths": ["See full explanation"],
                    "concerns": [],
                    "recommendation": screening_result.get('ai_recommendation', 'Review needed')
                }
            
            return {
                "success": True,
                "explanation": result.get("explanation", ""),
                "strengths": result.get("strengths", []),
                "concerns": result.get("concerns", []),
                "recommendation": result.get("recommendation", ""),
                "confidence_score": 0.85
            }
        
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._fallback_explanation(candidate_data, job_data, screening_result)
    
    def _fallback_explanation(
        self,
        candidate_data: Dict,
        job_data: Dict,
        screening_result: Dict
    ) -> Dict:
        """Generate fallback explanation when API is unavailable."""
        overall_score = screening_result.get('overall_score', 0)
        skill_score = screening_result.get('skill_match_score', 0)
        exp_score = screening_result.get('experience_match_score', 0)
        
        if overall_score >= 80:
            explanation = f"This candidate shows strong alignment with the {job_data.get('title', 'position')} requirements with an overall match score of {overall_score}%."
            recommendation = "Recommended for interview"
        elif overall_score >= 60:
            explanation = f"This candidate shows moderate alignment with the requirements. With a {overall_score}% match score, there are some areas worth exploring further."
            recommendation = "Review recommended"
        else:
            explanation = f"This candidate shows limited alignment with the core requirements, scoring {overall_score}% overall."
            recommendation = "Consider other candidates"
        
        strengths = []
        if skill_score >= 80:
            strengths.append("Strong skill match with job requirements")
        if exp_score >= 80:
            strengths.append("Meets or exceeds experience requirements")
        if not strengths:
            strengths.append("Resume submitted for review")
        
        concerns = []
        if skill_score < 60:
            concerns.append("Skill gap identified - may require training")
        if exp_score < 60:
            concerns.append("Experience below typical requirements")
        
        return {
            "success": True,
            "explanation": explanation,
            "strengths": strengths,
            "concerns": concerns,
            "recommendation": recommendation,
            "confidence_score": 0.7  # Lower confidence for fallback
        }
    
    async def generate_detailed_analysis(
        self,
        candidate_text: str,
        candidate_skills: List[str],
        candidate_experience: float,
        job_title: str,
        job_description: str,
        job_required_skills: List[str],
        file_path: Optional[str] = None,
        candidate_email: str = ""
    ) -> Dict:
        """
        Generate detailed candidate analysis (Strengths, Weaknesses, Risks, etc).
        If candidate_text is insufficient, keeps file_path for PDF-based analysis.
        """
        if not self._is_available():
            return self._fallback_detailed_analysis(candidate_skills, job_title)
            
        # If text is very short/empty but we have a file, try using Gemini Vision/PDF
        if (not candidate_text or len(candidate_text) < 200) and file_path:
            try:
                # Read file bytes directly to send inline (Avoids File API upload issues)
                import pathlib
                file_bytes = pathlib.Path(file_path).read_bytes()
                
                prompt = f"""
                Act as an expert AI Recruiter using the attached resume document.
                
                **JOB DETAILS:**
                Title: {job_title}
                Description: {job_description[:1000] if job_description else "Not provided"}
                Required Skills: {', '.join(job_required_skills)}
                
                **INSTRUCTIONS:**
                1. Analyze the attached resume file completely.
                2. EXTRACT the candidate's Contact Information (Email and Phone) if available.
                3. EXTRACT Skills, Years of Work Experience (excluding internships), and Years of Internship Experience.
                4. EXTRACT detailed Work History (array of {{company, role, duration, description}}) and Internship History (array of {{company, role, duration, description}}).
                5. EXTRACT Education details (degree name, field of study, institution, graduation year).
                6. EXTRACT Bonus Signals (github links, portfolios, certifications, open source contributions).
                7. EXTRACT the FULL TEXT content of the resume verbatim.
                8. Generate a detailed analysis.
                
                **OUTPUT FORMAT (JSON ONLY):**
                {
                    "extracted_info": {
                        "email": "string or empty",
                        "phone": "string or empty",
                        "skills": ["skill1", "skill2"],
                        "years_of_experience": number,
                        "work_experience_years": number,
                        "internship_experience_years": number,
                        "work_history": [{"company": "...", "role": "...", "duration": "...", "description": "..."}],
                        "internship_history": [{"company": "...", "role": "...", "duration": "...", "description": "..."}],
                        "education": [{"degree": "...", "field": "...", "institution": "...", "year": "..."}],
                        "bonus_signals": { "github": "...", "portfolio": "...", "certifications": ["..."], "open_source": boolean },
                        "full_text": "Complete extracted text from document"
                    },
                    "summary_of_fit": "Concise summary of why this candidate fits or doesn't fit the role",
                    "key_strengths": ["bullet point 1", "bullet point 2"],
                    "data_limitations": ["Any missing info or things to verify during interview"],
                    "recommendation": "Final recommendation (e.g., Highly Recommended, Consider, etc.)",
                    "overall_fit_score": number (0-100),
                    "justification": "Detailed justification (internal use)"
                }
                """
                
                content = [
                    {"mime_type": "application/pdf", "data": file_bytes},
                    prompt
                ]
                
                response = await self.model.generate_content_async(content)
                result_text = response.text.strip()
                
                if "```json" in result_text:
                    result_text = result_text.split("```json")[1].split("```")[0]
                elif "```" in result_text:
                    result_text = result_text.split("```")[1].split("```")[0]
                
                data = json.loads(result_text)
                # Map old keys for backward compatibility if needed in logic, but prioritize new ones
                if "summary_of_fit" in data:
                    data["justification"] = data["summary_of_fit"]
                if "key_strengths" in data:
                    data["strengths"] = data["key_strengths"]
                    
                return {"success": True, **data}

            except Exception as e:
                print(f"Gemini Vision Analysis Error: {e}")
                # Fall through to text-based fallback
        
        # Default Text-Based Analysis (if Vision skipped or failed)
        prompt = f"""
        Act as an expert AI Recruiter. Generate detailed analysis.
        
        **JOB DETAILS:**
        Title: {job_title}
        Description: {job_description[:1000] if job_description else "Not provided"}
        Required Skills: {', '.join(job_required_skills)}
        
        **CANDIDATE PROFILE:**
        Skills: {', '.join(candidate_skills)}
        Experience: {candidate_experience} years
        Email (if already known): {candidate_email}
        Resume Text:
        {candidate_text[:3000] if candidate_text else "Not provided"}
        
        **INSTRUCTIONS:**
        1. EXTRACT the candidate's email address and phone number from the resume text if present.
        2. Generate a detailed analysis of fit for the role.
        
        **OUTPUT FORMAT (JSON ONLY):**
        {{
            "extracted_info": {{
                "email": "extracted email address or empty string",
                "phone": "extracted phone number or empty string"
            }},
            "summary_of_fit": "Concise summary of why this candidate fits or doesn't fit the role",
            "key_strengths": ["bullet point 1", "bullet point 2"],
            "data_limitations": ["Any missing info or things to verify during interview"],
            "recommendation": "Final recommendation (e.g., Highly Recommended, Consider, etc.)",
            "overall_fit_score": number (0-100),
            "work_experience_years": number,
            "internship_experience_years": number,
            "work_history": [{{"company": "...", "role": "...", "duration": "...", "description": "..."}}],
            "internship_history": [{{"company": "...", "role": "...", "duration": "...", "description": "..."}}],
            "justification": "Detailed justification (internal use)"
        }}
        """
        content = prompt
        
        try:
            response = await self.model.generate_content_async(content)
            result_text = response.text.strip()
            
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            data = json.loads(result_text)
            # Map old keys for backward compatibility
            if "summary_of_fit" in data:
                data["justification"] = data["summary_of_fit"]
            if "key_strengths" in data:
                data["strengths"] = data["key_strengths"]
                
            return {"success": True, **data}
            
        except Exception as e:
            print(f"Gemini Analysis Error: {e}")
            return self._fallback_detailed_analysis(candidate_skills, job_title)

    def _fallback_detailed_analysis(self, candidate_skills: List[str] = [], job_title: str = "Position") -> Dict:
        """Fallback for detailed analysis if AI is unavailable."""
        top_skills = candidate_skills[:3] if candidate_skills else ["relevant skills"]
        return {
            "success": True,
            "strengths": [
                f"Demonstrates knowledge of {', '.join(top_skills)}",
                "Resume indicates relevant technical background",
                "Experience appears aligned with general industry standards"
            ],
            "weaknesses": [
                "Specific domain expertise could not be deeply verified without AI",
                "Soft skills assessment limited in offline mode"
            ],
            "risk_factors": [
                "Full depth of experience requires interview verification"
            ],
            "potential_rewards": [
                "Potential for quick ramp-up given current skill set",
                "Likely adaptable to team tools and workflows"
            ],
            "overall_fit_score": 70,
            "justification": f"Candidate possesses key skills ({', '.join(top_skills)}) relevant to the {job_title} role. While advanced AI analysis is unavailable, the baseline profile suggests a potential match worth reviewing."
        }

    async def generate_learning_path(
        self,
        candidate_data: Dict,
        job_data: Dict,
        status: str = "screening"
    ) -> Dict:
        """
        Generate personalized learning path and communication draft based on status.
        
        Args:
            candidate_data: Candidate profile (name, skills, etc)
            job_data: Job profile (title, required skills)
            status: Candidate status (selected, rejected, screening)
            
        Returns:
            Learning path and email draft
        """
        if not self._is_available():
            # Basic fallback that still works with the new signature expectation
            return self._fallback_learning_path([], status)
        
        candidate_name = f"{candidate_data.get('first_name', '')} {candidate_data.get('last_name', '')}"
        job_title = job_data.get('title', 'Position')
        candidate_skills = candidate_data.get('extracted_skills', [])
        required_skills = job_data.get('required_skills', [])
        
        # Calculate gaps locally to pass to prompt
        current_skills_set = set(s.lower() for s in candidate_skills)
        skill_gaps = [s for s in required_skills if s.lower() not in current_skills_set]

        prompt_context = f"""
        **Candidate:** {candidate_name}
        **Job Role:** {job_title}
        **Status:** {status}
        **Candidate Skills:** {', '.join(candidate_skills)}
        **Required Skills:** {', '.join(required_skills)}
        **Identified Gaps:** {', '.join(skill_gaps)}
        """

        if status.lower() in ["hired", "offer", "selected", "shortlisted", "interview"]:
            # Module 3: Selected Candidate - Pre-Onboarding
            prompt = f"""
            You are a senior engineering manager preparing a new hire.
            
            Input:
            - Job Role: {job_title}
            - Job Required Skills: {', '.join(required_skills)}
            - Candidate Strong Skills: {', '.join(candidate_skills)}
            - Candidate Weak Skills: {', '.join(skill_gaps)}
            
            Tasks:
            1. Identify skills the candidate must improve BEFORE onboarding.
            2. Explain why each skill is important for daily work.
            3. Suggest beginner-to-intermediate learning resources (YouTube based).
            4. Generate a pre-onboarding learning message.
            
            Output in JSON:
            {{
              "pre_onboarding_message": "paragraph",
              "skills_to_learn": [
                {{
                  "skill": "Skill Name",
                  "importance": "Why it matters",
                  "youtube_course_search": "search query string"
                }}
              ]
            }}
            """
        else:
            # Module 2: Rejected Candidate
            prompt = f"""
            You are a career mentor AI.
            
            Input:
            - Job Role: {job_title}
            - Job Required Skills: {', '.join(required_skills)}
            - Candidate Weak/Missing Skills: {', '.join(skill_gaps)}
            
            Tasks:
            1. Clearly explain why the candidate was not selected (focus on gaps).
            2. Mention specific weak or missing skills for this role.
            3. For each weak/missing skill, suggest:
               - Learning topics
               - Free YouTube course recommendations (search-based, beginner-friendly)
            4. Keep the tone polite, encouraging, and professional.
            
            Output in JSON:
            {{
              "rejection_reason": "paragraph",
              "weak_areas": [
                {{
                  "skill": "Skill Name",
                  "reason": "Why it was critical",
                  "youtube_course_search": "search query string"
                }}
              ],
              "motivation_message": "Short encouraging closing"
            }}
            """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result_text = response.text
            
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            data = json.loads(result_text)
            return {"success": True, **data}
        
        except Exception as e:
            print(f"Gemini API error (Learning Path): {e}")
            return self._fallback_learning_path(skill_gaps, status)
    
    def _fallback_learning_path(self, skill_gaps: List[str], status: str) -> Dict:
        """Generate fallback learning paths."""
        paths = []
        is_hired = status.lower() in ["hired", "offer", "selected"]
        
        for skill in skill_gaps[:3]:
            paths.append({
                "skill": skill,
                "courses": [
                    {"name": f"{skill} Refresher", "platform": "Online", "url": "#"}
                ],
                "duration": "1 week",
                "priority": "High",
                "explanation": "Key requirement for the role."
            })
            
        return {
            "success": True,
            "learning_paths": paths,
            "email_subject": "Update regarding your application",
            "email_body": "Thank you for your interest. based on our assessment..." if not is_hired else "Congratulations on your offer! Here are some things to prepare..."
        }
    
    async def generate_success_prediction(
        self,
        candidate_data: Dict,
        job_data: Dict,
        interview_scores: Optional[Dict] = None
    ) -> Dict:
        """
        Predict post-hire success probability.
        
        Args:
            candidate_data: Candidate profile
            job_data: Job requirements
            interview_scores: Optional interview feedback
            
        Returns:
            Success prediction with factors
        """
        if not self._is_available():
            return self._fallback_success_prediction(candidate_data, job_data)
        
        # Module 4: Success Predictor
        prompt = f"""
        You are an HR analytics expert.
        
        Input:
        - Candidate Experience Level: {candidate_data.get('experience_years', 0)} years
        - Skill Match Score: {candidate_data.get('skill_match_score', 0)}%
        - Skills: {', '.join(candidate_data.get('extracted_skills', []))}
        - Job Position: {job_data.get('title', 'Unknown')}
        
        Tasks:
        1. Predict long-term success probability.
        2. Estimate time to productivity.
        3. Assess attrition (flight risk).
        4. Justify predictions logically.
        
        Output in JSON:
        {{
          "success_probability": "percentage (0-100)",
          "time_to_productivity": "e.g., 2 months",
          "flight_risk": "Low | Medium | High",
          "reasoning": "Explanation of the analysis"
        }}
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result_text = response.text
            
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            
            result = json.loads(result_text)
            # Normalize keys if needed or mapping
            return {"success": True, **result}
        
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._fallback_success_prediction(candidate_data, job_data)
    
    def _fallback_success_prediction(self, candidate_data: Dict, job_data: Dict) -> Dict:
        """Generate fallback success prediction."""
        skill_score = candidate_data.get('skill_match_score', 50)
        exp_years = candidate_data.get('experience_years', 0)
        
        # Simple heuristic-based prediction
        success_score = min(skill_score * 0.6 + min(exp_years * 5, 40), 100)
        
        if success_score >= 80:
            performance = "high"
        elif success_score >= 60:
            performance = "medium"
        else:
            performance = "low"
        
        return {
            "success": True,
            "success_score": round(success_score, 1),
            "performance": performance,
            "retention": round(0.5 + (success_score / 200), 2),
            "productivity_time": "3-6 months",
            "positive_factors": ["Skills align with requirements", "Experience level appropriate"],
            "risk_factors": ["Standard onboarding required"],
            "explanation": f"Based on skill match ({skill_score}%) and experience ({exp_years} years), this candidate shows {'strong' if success_score >= 70 else 'moderate'} potential for success."
        }
    
    async def analyze_team_compatibility(
        self,
        candidate_profile: Dict,
        team_profile: Dict
    ) -> Dict:
        """
        Analyze candidate compatibility with existing team.
        
        Args:
            candidate_profile: Candidate traits and skills
            team_profile: Existing team composition
            
        Returns:
            Compatibility analysis
        """
        if not self._is_available():
            return self._fallback_team_compatibility()
        
        # Module 5: Team Compatibility Analyst
        prompt = f"""
        You are a team dynamics analyst.
        
        Input:
        - Current Team Skill Composition: {', '.join(team_profile.get('skills', []))}
        - Team Size: {team_profile.get('size', '5-10')}
        - Candidate Skill Set: {', '.join(candidate_profile.get('skills', []))}
        - Candidate Experience: {candidate_profile.get('experience', 0)} years
        
        Tasks:
        1. Analyze how the candidate complements the team.
        2. Identify added value or redundancy.
        3. Predict work-style compatibility.
        
        Output in JSON:
        {{
          "overall_compatibility": 85,
          "communication_style_match": 80,
          "work_style_match": 90,
          "skills_complement": 85,
          "strengths": ["List of skills/traits added"],
          "challenges": ["List of potential conflicts/gaps"],
          "recommendation": "Concise analysis and recommendation"
        }}
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result_text = response.text
            
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            
            return {"success": True, **json.loads(result_text)}
        
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._fallback_team_compatibility()
    
    def _fallback_team_compatibility(self) -> Dict:
        """Generate fallback team compatibility analysis."""
        return {
            "success": True,
            "overall_compatibility": 75,
            "communication_style_match": 70,
            "work_style_match": 75,
            "skills_complement": 80,
            "strengths": ["Brings complementary skills", "Experience level fits team needs"],
            "challenges": ["May need time to adapt to team workflow"],
            "recommendation": "Good potential fit with standard onboarding"
        }



    async def generate_career_path(
        self,
        candidate_skills: List[str],
        current_experience: float,
        current_role: str = "",
        updates: str = ""
    ) -> Dict:
        """
        Generate potential career paths.
        
        Args:
            candidate_skills: Current skills
            current_experience: Years of experience
            
        Returns:
            Career path simulation
        """
        if not self._is_available():
            return self._fallback_career_path(candidate_skills)
        
        # Module 7: Career Simulator
        prompt = f"""
        You are a career growth strategist.
        
        Input:
        - Candidate Current Skills: {', '.join(candidate_skills)}
        - Experience: {current_experience} years
        - Current Role: {current_role}
        - Growth Factors / Updates: {updates}
        
        Tasks:
        1. Predict career progression over 1, 3, and 5 years.
        2. Identify skills required for each promotion.
        3. Quantify probability and expected compensation growth.
        
        Output in JSON:
        {{
          "career_paths": [
            {{
              "title": "Projected Job Title",
              "probability": 85,
              "timeline": "e.g. 1-2 years",
              "skills_needed": ["Skill 1", "Skill 2"],
              "salary_increase": "+20%"
            }}
          ]
        }}
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result_text = response.text
            
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            data = json.loads(result_text)
            
            # Normalize keys
            if "career_path" in data and "career_paths" not in data:
                data["career_paths"] = data["career_path"]
                
            return {"success": True, **data}
        
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._fallback_career_path(candidate_skills)
    
    def _fallback_career_path(self, skills: List[str]) -> Dict:
        """Generate fallback career paths."""
        return {
            "success": True,
            "career_paths": [
                {
                    "title": "Senior Developer",
                    "timeline": "2-3 years",
                    "skills_needed": ["System Design", "Cloud Architecture"],
                    "salary_increase": "30-50%"
                },
                {
                    "title": "Tech Lead",
                    "timeline": "4-5 years",
                    "skills_needed": ["Team Leadership", "Project Management"],
                    "salary_increase": "50-80%"
                },
                {
                    "title": "Software Architect",
                    "timeline": "5+ years",
                    "skills_needed": ["Enterprise Patterns", "Scalability"],
                    "salary_increase": "80-120%"
                }
            ]
        }

    async def generate_cost_intelligence(
        self,
        candidate_data: Dict,
        job_data: Dict
    ) -> Dict:
        """
        Generate hiring cost and ROI intelligence.
        """
        if not self._is_available():
            return self._fallback_cost_intelligence()
            
        # Module 6: Cost & ROI Intelligence
        prompt = f"""
        You are a hiring cost and ROI analyst.
        
        Input:
        - Candidate Experience: {candidate_data.get('experience_years', 0)} years
        - Job Salary Range: ${job_data.get('salary_min', 0)} - ${job_data.get('salary_max', 0)}
        - Match Score: {candidate_data.get('overall_score', 0)}%
        
        Tasks:
        1. Estimate total hiring investment.
        2. Predict ROI value.
        3. Classify candidate as: Overpriced, Fair Value, or High ROI Candidate.
        
        Output in JSON:
        {{
          "total_cost_estimate": "$Amount",
          "roi_prediction": "High | Medium | Low",
          "value_classification": "Overpriced | Fair Value | High ROI Candidate",
          "justification": "Why this classification"
        }}
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result_text = response.text
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            return {"success": True, **json.loads(result_text)}
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._fallback_cost_intelligence()

    def _fallback_cost_intelligence(self) -> Dict:
        """Fallback for cost intelligence."""
        return {
            "success": True,
            "estimated_salary": 85000,
            "total_investment": 95000,
            "roi_percentage": 145,
            "roi_level": "High",
            "cost_tips": [
                "Streamline technical screening to reduce interviewer time",
                "Invest in high-quality onboarding to reduce time-to-productivity"
            ],
            "ai_analysis": "Candidate offers strong skill alignment which reduces long-term training costs."
        }


# Singleton instance
gemini_service = GeminiService()
