"""
One-time cleanup script: Fix placeholder emails AND re-extract real emails
for existing candidate records.

This script:
1. Finds all candidates with placeholder emails (@example.com, etc.) or empty emails
2. Attempts to re-extract the real email from resume_text or ai_analysis_json
3. Updates the database with the real email, or clears the placeholder
4. Fixes "(Candidate)" last names

Run from the backend directory:
    python cleanup_placeholder_emails.py
"""
import re
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models


def is_placeholder_email(email: str) -> bool:
    """Check if an email is a placeholder/fake one."""
    if not email:
        return False  # Empty is not a placeholder, it's just missing
    
    placeholder_patterns = [
        r'@example\.com$',
        r'^candidate',
        r'\(candidate\)',
        r'candidateexample',
    ]
    for pattern in placeholder_patterns:
        if re.search(pattern, email, re.IGNORECASE):
            return True
    return False


def extract_email_from_text(text: str) -> str:
    """Extract a valid email from text using multiple strategies."""
    if not text:
        return ""
    
    # Normalize text
    text_clean = text.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    
    # Strategy A: Standard regex
    email_pattern = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    matches = re.findall(email_pattern, text_clean)
    
    if not matches:
        # Strategy B: Fix PDF artifacts (spaces around @)
        text_nospace = re.sub(r'\s*@\s*', '@', text_clean)
        text_nospace = re.sub(r'\s*\.\s*(?=com|org|net|edu|in|co|io)', '.', text_nospace)
        matches = re.findall(email_pattern, text_nospace)
    
    if not matches:
        # Strategy C: Line breaks splitting email
        text_joined = text.replace('\r\n', '').replace('\n', '').replace('\r', '')
        matches = re.findall(email_pattern, text_joined)
    
    if not matches:
        # Strategy D: Look for "email" label nearby
        label_pattern = r'(?:e[-\s]?mail|email\s*(?:id|address)?)[\s:|-]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})'
        label_matches = re.findall(label_pattern, text_clean, re.IGNORECASE)
        if label_matches:
            matches = label_matches
    
    # Filter out placeholder/invalid emails
    valid = []
    for email in matches:
        email = email.strip().rstrip('.')
        if email.endswith('.pdf') or email.endswith('.doc') or email.endswith('.docx'):
            continue
        local_part = email.split('@')[0]
        if len(local_part) < 2:
            continue
        if is_placeholder_email(email):
            continue
        valid.append(email)
    
    if not valid:
        return ""
    
    # Prefer personal email domains
    personal_domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
                       'icloud.com', 'protonmail.com', 'mail.com', 'aol.com',
                       'zoho.com', 'ymail.com', 'rediffmail.com']
    
    for email in valid:
        domain = email.split('@')[1].lower()
        if domain in personal_domains:
            return email
    
    return valid[0]


def main():
    db = SessionLocal()
    try:
        # Find all candidates
        candidates = db.query(models.Candidate).all()
        
        total = len(candidates)
        placeholder_count = 0
        empty_email_count = 0
        fixed_count = 0
        cleared_count = 0
        lastname_fixed = 0
        
        print(f"\n{'='*60}")
        print(f"  Email & Name Cleanup Script")
        print(f"{'='*60}")
        print(f"  Total candidates in database: {total}\n")
        
        for candidate in candidates:
            needs_fix = is_placeholder_email(candidate.email) or not candidate.email
            
            if needs_fix:
                if is_placeholder_email(candidate.email):
                    placeholder_count += 1
                else:
                    empty_email_count += 1
                    
                old_email = candidate.email or "(empty)"
                real_email = ""
                source = ""
                
                # Strategy 1: Check AI analysis JSON for extracted email
                if candidate.ai_analysis_json:
                    extracted_info = candidate.ai_analysis_json.get("extracted_info", {})
                    ai_email = extracted_info.get("email", "")
                    if ai_email and not is_placeholder_email(ai_email):
                        # Validate format
                        if re.match(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$', ai_email):
                            real_email = ai_email
                            source = "AI analysis"
                
                # Strategy 2: Re-extract from resume text
                if not real_email and candidate.resume_text:
                    text_email = extract_email_from_text(candidate.resume_text)
                    if text_email:
                        real_email = text_email
                        source = "resume text"
                
                # Apply fix
                if real_email:
                    candidate.email = real_email
                    fixed_count += 1
                    print(f"  ✓ FIXED   [{candidate.id}] {candidate.first_name} {candidate.last_name}")
                    print(f"            {old_email} → {real_email} (from {source})")
                else:
                    if is_placeholder_email(candidate.email):
                        candidate.email = ""
                        cleared_count += 1
                        print(f"  ✗ CLEARED [{candidate.id}] {candidate.first_name} {candidate.last_name}")
                        print(f"            {old_email} → (empty - no real email found)")
                    else:
                        print(f"  - SKIPPED [{candidate.id}] {candidate.first_name} {candidate.last_name}")
                        print(f"            Already empty, no email found in data")
            
            # Fix "(Candidate)" last names
            if candidate.last_name == "(Candidate)":
                candidate.last_name = "Unknown"
                lastname_fixed += 1
                print(f"  ↻ NAME    [{candidate.id}] Fixed last name: (Candidate) → Unknown")
        
        changes = placeholder_count + empty_email_count + lastname_fixed
        if changes > 0:
            db.commit()
            print(f"\n{'='*60}")
            print(f"  Results:")
            print(f"    Placeholder emails found:   {placeholder_count}")
            print(f"    Empty emails checked:        {empty_email_count}")
            print(f"    Fixed with real email:        {fixed_count}")
            print(f"    Cleared placeholders:         {cleared_count}")
            print(f"    Last names fixed:             {lastname_fixed}")
            print(f"{'='*60}\n")
        else:
            print(f"\n  ✓ All records are clean. No changes needed!\n")
            
    except Exception as e:
        db.rollback()
        print(f"\n  ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
