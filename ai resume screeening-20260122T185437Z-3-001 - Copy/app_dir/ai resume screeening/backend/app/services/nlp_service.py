"""NLP Service for skill extraction and text processing."""
import re
from typing import List, Dict, Tuple, Optional, Any
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# Common technical skills database for keyword matching
TECHNICAL_SKILLS = {
    # Programming Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl", "shell", "bash",
    
    # Frontend
    "react", "reactjs", "react.js", "vue", "vuejs", "vue.js", "angular", "angularjs",
    "svelte", "nextjs", "next.js", "nuxt", "gatsby", "html", "html5", "css", "css3",
    "sass", "scss", "less", "tailwind", "tailwindcss", "bootstrap", "material-ui",
    "styled-components", "jquery", "redux", "mobx", "webpack", "vite", "parcel",
    
    # Backend
    "node", "nodejs", "node.js", "express", "expressjs", "fastapi", "django", "flask",
    "spring", "spring boot", "springboot", "rails", "ruby on rails", "asp.net", "laravel",
    "nestjs", "graphql", "rest", "restful", "api", "microservices", "grpc",
    
    # Databases
    "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch",
    "cassandra", "dynamodb", "oracle", "sqlite", "mariadb", "neo4j", "firebase",
    "supabase", "prisma", "sequelize", "mongoose", "sqlalchemy",
    
    # Cloud & DevOps
    "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes",
    "k8s", "jenkins", "terraform", "ansible", "puppet", "chef", "ci/cd", "circleci",
    "github actions", "gitlab ci", "travis", "nginx", "apache", "linux", "unix",
    
    # AI/ML
    "machine learning", "deep learning", "tensorflow", "pytorch", "keras", "scikit-learn",
    "sklearn", "nlp", "natural language processing", "computer vision", "opencv",
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "jupyter", "data science",
    "data analysis", "data engineering", "spark", "hadoop", "airflow", "mlops",
    
    # Mobile
    "android", "ios", "react native", "flutter", "xamarin", "ionic", "cordova",
    
    # Testing
    "jest", "mocha", "chai", "pytest", "unittest", "selenium", "cypress", "playwright",
    "testing", "unit testing", "integration testing", "e2e", "tdd", "bdd",
    
    # Tools & Others
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "slack",
    "figma", "sketch", "adobe xd", "postman", "swagger", "agile", "scrum", "kanban"
}

# Soft skills
SOFT_SKILLS = {
    "leadership", "communication", "teamwork", "problem solving", "problem-solving",
    "critical thinking", "creativity", "adaptability", "time management",
    "project management", "analytical", "attention to detail", "collaboration",
    "presentation", "negotiation", "mentoring", "coaching", "decision making"
}


import pypdf

# ... (Skills constants)

class NLPService:
    """NLP service for resume parsing and skill extraction."""
    
    def __init__(self):
        self.technical_skills = TECHNICAL_SKILLS
        self.soft_skills = SOFT_SKILLS

    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text content from a PDF file."""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                reader = pypdf.PdfReader(file)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""
    
    def extract_skills(self, text: str) -> Dict[str, List[str]]:
        """
        Extract technical and soft skills from resume text.
        
        Args:
            text: Resume text content
            
        Returns:
            Dictionary with 'technical' and 'soft' skill lists
        """
        if not text:
            return {"technical": [], "soft": []}
        
        text_lower = text.lower()
        
        # Extract technical skills
        technical_found = []
        for skill in self.technical_skills:
            # Use word boundary matching
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                technical_found.append(skill.title() if len(skill) > 2 else skill.upper())
        
        # Extract soft skills
        soft_found = []
        for skill in self.soft_skills:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                soft_found.append(skill.title())
        
        return {
            "technical": list(set(technical_found)),
            "soft": list(set(soft_found))
        }
    
    def calculate_skill_gap(self, resume_text: str, required_skills: List[str]) -> List[str]:
        """
        Identify missing skills using TF-IDF and similarity matching.
        
        Args:
            resume_text: Full text of the candidate's resume
            required_skills: List of skills required for the job
            
        Returns:
            List of missing or weak skills
        """
        if not required_skills:
            return []
            
        resume_text_lower = resume_text.lower()
        missing_skills = []
        
        # 1. Direct Keyword Check (Fast)
        for skill in required_skills:
            skill_lower = skill.lower()
            pattern = r'\b' + re.escape(skill_lower) + r'\b'
            if not re.search(pattern, resume_text_lower):
                # 2. Vectorized Similarity Check (More accurate for variations)
                # If specific keyword is missing, check if related concepts are present
                vectorizer = TfidfVectorizer(ngram_range=(1, 2))
                try:
                    # Sample some context around where the skill might be
                    # This is a simplified TF-IDF similarity check
                    tfidf = vectorizer.fit_transform([resume_text_lower, skill_lower])
                    similarity = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
                    
                    if similarity < 0.3: # Threshold for "missing"
                        missing_skills.append(skill)
                except:
                    # Fallback to direct check if vectorization fails (e.g. empty text)
                    missing_skills.append(skill)
                    
        return missing_skills[:5] # Limit to top 5 as requested
    
    def extract_experience_years(self, text: str) -> float:
        """
        Extract years of experience from resume text.
        
        Args:
            text: Resume text content
            
        Returns:
            Estimated years of experience
        """
        if not text:
            return 0.0
        
        text_lower = text.lower()
        
        # Pattern matching for experience mentions
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'experience\s*(?:of\s*)?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*(?:in|as|working)',
            r'over\s*(\d+)\s*years?',
            r'more\s*than\s*(\d+)\s*years?'
        ]
        
        max_years = 0.0
        for pattern in patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                years = float(match)
                if years > max_years and years < 50:  # Sanity check
                    max_years = years
        
        return max_years
    
    def extract_education(self, text: str) -> List[Dict]:
        """
        Extract education information from resume text.
        
        Args:
            text: Resume text content
            
        Returns:
            List of education entries
        """
        if not text:
            return []
        
        text_lower = text.lower()
        education = []
        
        # Degree patterns
        degrees = {
            "phd": ["ph.d", "phd", "doctorate", "doctor of philosophy"],
            "masters": ["master's", "masters", "m.s.", "m.sc", "mba", "m.tech", "mtech"],
            "bachelors": ["bachelor's", "bachelors", "b.s.", "b.sc", "b.tech", "btech", "b.e."],
            "associate": ["associate's", "associates", "a.s.", "a.a."]
        }
        
        for degree_type, keywords in degrees.items():
            for keyword in keywords:
                if keyword in text_lower:
                    education.append({
                        "degree": degree_type.title(),
                        "detected_keyword": keyword
                    })
                    break
        
        return education

    def extract_email(self, text: str) -> str:
        """
        Extract email address from resume text.
        Uses multiple strategies to handle PDF artifacts, OCR issues, and formatting.
        """
        if not text:
            return ""
        
        # Normalize text: collapse newlines, tabs, and excess spaces
        text_clean = text.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        
        # Strategy A: Standard email regex on cleaned text
        email_pattern = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
        matches = re.findall(email_pattern, text_clean)
        
        if not matches:
            # Strategy B: Fix PDF artifacts — spaces around @ symbol
            # e.g. "john .doe @ gmail . com" or "john@ gmail.com"
            text_nospace = re.sub(r'\s*@\s*', '@', text_clean)
            text_nospace = re.sub(r'\s*\.\s*(?=com|org|net|edu|in|co|io)', '.', text_nospace)
            matches = re.findall(email_pattern, text_nospace)
        
        if not matches:
            # Strategy C: Handle line breaks splitting an email address
            # Try joining lines without spaces where @ appears nearby
            text_joined = text.replace('\r\n', '').replace('\n', '').replace('\r', '')
            matches = re.findall(email_pattern, text_joined)
        
        if not matches:
            # Strategy D: Look for "email" label nearby and extract
            label_pattern = r'(?:e[-\s]?mail|email\s*(?:id|address)?)[\s:|-]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})'
            label_matches = re.findall(label_pattern, text_clean, re.IGNORECASE)
            if label_matches:
                matches = label_matches
        
        if not matches:
            return ""
        
        # Filter out obviously invalid emails
        valid_matches = []
        for email in matches:
            email = email.strip().rstrip('.')
            # Skip if it looks like a filename or URL fragment
            if email.endswith('.pdf') or email.endswith('.doc') or email.endswith('.docx'):
                continue
            # Skip extremely short local parts
            local_part = email.split('@')[0]
            if len(local_part) < 2:
                continue
            valid_matches.append(email)
        
        if not valid_matches:
            return ""
        
        # If only one, return it
        if len(valid_matches) == 1:
            return valid_matches[0]
        
        # If multiple emails found, pick the most likely personal/primary one
        # Priority: personal domains > work domains > other
        personal_domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
                           'icloud.com', 'protonmail.com', 'mail.com', 'aol.com',
                           'zoho.com', 'ymail.com', 'rediffmail.com']
        
        for email in valid_matches:
            domain = email.split('@')[1].lower()
            if domain in personal_domains:
                return email
        
        # Fall back to first valid match (usually at top of resume = contact section)
        return valid_matches[0]

    def extract_phone(self, text: str) -> str:
        """
        Extract phone number from resume text.
        """
        if not text:
            return ""
        
        text_clean = text.replace('\n', ' ')
        
        # Targeted Phone Patterns (High Precision)
        patterns = [
            # India/Intl: +91 98765 43210, +91-98765-43210
            r'(?:\+91|91)?[\-\s]?[6-9]\d{9}\b',
            # US/Generic: (123) 456-7890, 123-456-7890
            r'\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}\b',
            # Space separated: 987 654 3210
            r'\b\d{3}\s\d{3}\s\d{4}\b',
            # Dot separated: 987.654.3210
            r'\b\d{3}\.\d{3}\.\d{4}\b'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text_clean)
            if matches:
                # Filter out years (e.g., "2020-2024") which look like phones
                # Phone numbers usually don't start with 19xx or 20xx unless valid area code
                valid_phones = [
                    p for p in matches 
                    if not (p.strip().startswith('20') and len(p.strip()) == 9) # mitigate year ranges
                ]
                if valid_phones:
                    return valid_phones[0]
                    
        return ""
    
    def calculate_required_skills_score(self, candidate_skills: List[str], required_skills: List[str]) -> float:
        """Required Skills Match (35 points)"""
        if not required_skills:
            return 35.0
        
        candidate_set = {s.lower() for s in candidate_skills}
        required_set = {s.lower() for s in required_skills}
        
        matched = len(candidate_set & required_set)
        total = len(required_set)
        
        return (matched / total) * 35.0

    def calculate_experience_score_ats(self, candidate_exp: float, min_exp: float, max_exp: Optional[float] = None) -> float:
        """Experience Match (20 points)"""
        if min_exp <= 0:
            return 20.0
            
        if candidate_exp < min_exp:
            return (candidate_exp / min_exp) * 20.0
        elif max_exp and candidate_exp > max_exp:
            return 16.0 # Cap for overqualified
        else:
            return 20.0

    def calculate_responsibilities_score(self, resume_text: str, responsibilities: List[str]) -> float:
        """Key Responsibilities Match (20 points)"""
        if not responsibilities:
            return 20.0
            
        text_lower = resume_text.lower()
        matched = 0
        for resp in responsibilities:
            # Simple keyword/phrase match for now, can be improved with semantic similarity
            # Extract nouns/verbs from responsibility and check presence
            words = re.findall(r'\w+', resp.lower())
            important_words = [w for w in words if len(w) > 3] # naive filter
            if any(w in text_lower for w in important_words):
                matched += 1
                
        return (matched / len(responsibilities)) * 20.0

    def calculate_education_score_ats(self, candidate_edu_list: List[Dict], required_edu: str) -> float:
        """Education Match (10 points)"""
        if not required_edu or required_edu.lower() == "any":
            return 10.0
            
        edu_rank = {"Diploma": 1, "Bachelor's": 2, "Master's": 3, "PhD": 4}
        required_rank = edu_rank.get(required_edu, 1)
        
        max_candidate_rank = 0
        for edu in candidate_edu_list:
            degree = edu.get("degree", "")
            # Map common degree names to our ranks
            rank = 0
            if "Bachelor" in degree: rank = 2
            elif "Master" in degree or "MBA" in degree: rank = 3
            elif "PhD" in degree or "Doctor" in degree: rank = 4
            elif "Diploma" in degree: rank = 1
            
            if rank > max_candidate_rank:
                max_candidate_rank = rank
        
        if max_candidate_rank >= required_rank:
            return 10.0
        elif max_candidate_rank == required_rank - 1:
            return 7.0 # Related/One level below
        else:
            return 4.0 # Unrelated/Too low

    def calculate_preferred_score_ats(self, candidate_skills: List[str], preferred_qualifications: List[str]) -> float:
        """Preferred Qualifications (10 points)"""
        if not preferred_qualifications:
            return 10.0 # Redistribute or give full if not specified
            
        text_match = 0
        candidate_skills_lower = [s.lower() for s in candidate_skills]
        
        # Check against skills and common qualifications
        for pref in preferred_qualifications:
            pref_lower = pref.lower()
            if any(s in pref_lower for s in candidate_skills_lower):
                text_match += 1
            elif pref_lower in " ".join(candidate_skills_lower):
                 text_match += 1
                 
        return (text_match / len(preferred_qualifications)) * 10.0

    def calculate_bonus_penalty_score(self, candidate_data: Dict) -> float:
        """Bonus / Penalty Rules (5 points)"""
        bonus = 0.0
        
        # Relevant Internship: +2
        if candidate_data.get("has_internship") or candidate_data.get("intern_experience_years", 0) > 0:
            bonus += 2
            
        # Open source / Portfolio: +2 (check resume text for github/portfolio)
        resume_text = candidate_data.get("resume_text", "").lower()
        if "github.com" in resume_text or "portfolio" in resume_text or "behance" in resume_text:
            bonus += 2
            
        # Certifications: +1
        if "certified" in resume_text or "certification" in resume_text:
            bonus += 1
            
        # Penalty: Job hopping (very frequent) -2
        # (Naive check: more than 3 jobs in last 2 years?)
        # For now, let's keep it simple
        
        return min(max(bonus, -5.0), 5.0)

    def calculate_ats_overall_score(self, candidate: Any, job: Any) -> Tuple[float, Dict]:
        """Final Score Calculation and Breakdown"""
        breakdown = {}
        
        # 1. Required Skills (35)
        breakdown["required_skills"] = self.calculate_required_skills_score(
            candidate.extracted_skills or [], 
            job.required_skills or []
        )
        
        # 2. Experience (20)
        breakdown["experience"] = self.calculate_experience_score_ats(
            candidate.work_experience_years or candidate.experience_years or 0,
            job.min_experience_years or 0,
            job.max_experience_years
        )
        
        # 3. Responsibilities (20)
        breakdown["responsibilities"] = self.calculate_responsibilities_score(
            candidate.resume_text or "",
            job.key_responsibilities or []
        )
        
        # 4. Education (10)
        breakdown["education"] = self.calculate_education_score_ats(
            candidate.education or [],
            job.min_education or "Any"
        )
        
        # 5. Preferred (10)
        breakdown["preferred"] = self.calculate_preferred_score_ats(
            candidate.extracted_skills or [],
            job.preferred_qualifications or []
        )
        
        # 6. Bonus (5)
        breakdown["bonus"] = self.calculate_bonus_penalty_score({
            "has_internship": candidate.intern_experience_years > 0,
            "intern_experience_years": candidate.intern_experience_years,
            "resume_text": candidate.resume_text
        })
        
        final_score = sum(breakdown.values())
        final_score = min(max(final_score, 0), 100)
        
        return final_score, breakdown
    
    def calculate_experience_match_score(self, work_years: float, intern_years: float, min_required_years: float) -> float:
        """
        Calculate experience match score based on HR guidelines.
        
        - 1+ year work experience: High score (60-100%).
        - < 1 year work exp or Internships only: Low score (< 50%).
        """
        if min_required_years == 0:
            # If no requirement, 1+ year work is 100%, otherwise 49%
            return 100.0 if work_years >= 1.0 else 49.0
            
        if work_years >= 1.0:
            if work_years >= min_required_years:
                return 100.0
            else:
                # Partial but qualified (above 50%)
                ratio = work_years / min_required_years
                return 50.0 + (ratio * 40.0) # 50% to 90%
        else:
            # Under 1 year work experience - Limited potential
            # Even with many internships, we cap at 49% as per HR request
            work_score = (work_years * 30) # 0.5y -> 15%
            intern_score = (intern_years * 10) # 1y -> 10%
            return min(49.0, work_score + intern_score + 10.0) # start at 10% base if parsed
    
    def parse_hr_rule(self, rule_text: str) -> Dict:
        """
        Parse HR natural language rule and extract conditions.
        
        Args:
            rule_text: Natural language rule from HR
            
        Returns:
            Parsed rule with keywords and conditions
        """
        text_lower = rule_text.lower()
        result = {
            "original_text": rule_text,
            "action": None,  # include, exclude
            "keywords": [],
            "conditions": {}
        }
        
        # Detect action type
        exclude_patterns = ["remove", "exclude", "reject", "no ", "don't", "without"]
        include_patterns = ["shortlist", "include", "only", "must have", "require"]
        
        for pattern in exclude_patterns:
            if pattern in text_lower:
                result["action"] = "exclude"
                break
        
        if not result["action"]:
            for pattern in include_patterns:
                if pattern in text_lower:
                    result["action"] = "include"
                    break
        
        if not result["action"]:
            result["action"] = "filter"  # Default
        
        # Extract skill keywords
        for skill in self.technical_skills:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                result["keywords"].append(skill)
        
        # Extract experience requirements
        exp_match = re.search(r'(\d+)\+?\s*years?', text_lower)
        if exp_match:
            result["conditions"]["min_experience"] = int(exp_match.group(1))
        
        return result
    
    def apply_hr_rules(
        self,
        candidate_skills: List[str],
        candidate_experience: float,
        rules: List[Dict]
    ) -> Tuple[bool, List[str]]:
        """
        Apply HR rules to determine if candidate passes filters.
        
        Args:
            candidate_skills: List of candidate's skills
            candidate_experience: Years of experience
            rules: List of parsed HR rules
            
        Returns:
            Tuple of (passes_filter, list_of_reasons)
        """
        passes = True
        reasons = []
        
        candidate_skills_lower = {s.lower() for s in candidate_skills}
        
        for rule in rules:
            action = rule.get("action")
            keywords = [k.lower() for k in rule.get("keywords", [])]
            conditions = rule.get("conditions", {})
            
            if action == "exclude":
                # Check if candidate should be excluded
                matching_skills = candidate_skills_lower & set(keywords)
                if matching_skills:
                    passes = False
                    reasons.append(f"Excluded due to HR rule: has {', '.join(matching_skills)}")
            
            elif action == "include":
                # Check if candidate has required skills
                if keywords:
                    if not (candidate_skills_lower & set(keywords)):
                        passes = False
                        reasons.append(f"Missing required skills: {', '.join(keywords)}")
            
            # Check experience conditions
            min_exp = conditions.get("min_experience")
            if min_exp and candidate_experience < min_exp:
                passes = False
                reasons.append(f"Experience ({candidate_experience}y) below required ({min_exp}y)")
        
        return passes, reasons


# Singleton instance
nlp_service = NLPService()
