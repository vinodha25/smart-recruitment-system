# 📊 Database ER Diagram

## Entity-Relationship Diagram

```
┌─────────────────┐
│     USERS       │
│─────────────────│
│ id (PK)         │
│ email           │
│ password        │
│ full_name       │
│ role            │◄────────┐
│ department      │         │
│ is_active       │         │
└─────────────────┘         │
         │                  │
         │ creates          │ decided_by
         │                  │
         ▼                  │
┌─────────────────┐         │
│      JOBS       │         │
│─────────────────│         │
│ id (PK)         │         │
│ title           │         │
│ department      │         │
│ required_skills │         │
│ min_experience  │         │
│ status          │         │
│ created_by (FK) │─────────┘
└─────────────────┘
         │
         │ has many
         │
         ▼
┌─────────────────┐
│   CANDIDATES    │
│─────────────────│
│ id (PK)         │
│ job_id (FK)     │◄────────────────┐
│ first_name      │                 │
│ last_name       │                 │
│ email           │                 │
│ resume_text     │                 │
│ extracted_skills│                 │
│ overall_score   │                 │
│ ai_recommendation│                │
│ status          │                 │
└─────────────────┘                 │
         │                          │
         │ has                      │
         │                          │
         ├──────────────────────────┤
         │                          │
         ▼                          │
┌─────────────────┐                 │
│   INTERVIEWS    │                 │
│─────────────────│                 │
│ id (PK)         │                 │
│ candidate_id(FK)│─────────────────┘
│ interview_type  │
│ scheduled_at    │
│ status          │
│ feedback        │
│ rating          │
└─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│ HIRING_DECISIONS│
│─────────────────│
│ id (PK)         │
│ candidate_id(FK)│─────────────────┐
│ decision        │                 │
│ reason          │                 │
│ ai_recommendation│                │
│ hr_override     │                 │
│ decided_by (FK) │                 │
└─────────────────┘                 │
                                    │
┌─────────────────┐                 │
│  LEARNING_PATHS │                 │
│─────────────────│                 │
│ id (PK)         │                 │
│ candidate_id(FK)│─────────────────┤
│ skill_name      │                 │
│ recommended_    │                 │
│   courses       │                 │
│ ai_explanation  │                 │
└─────────────────┘                 │
                                    │
┌─────────────────┐                 │
│SUCCESS_         │                 │
│  PREDICTIONS    │                 │
│─────────────────│                 │
│ id (PK)         │                 │
│ candidate_id(FK)│─────────────────┤
│ success_score   │                 │
│ retention_prob  │                 │
│ performance     │                 │
│ ai_explanation  │                 │
└─────────────────┘                 │
                                    │
┌─────────────────┐                 │
│TEAM_COMPATIBILITY│                │
│─────────────────│                 │
│ id (PK)         │                 │
│ candidate_id(FK)│─────────────────┘
│ team_id         │
│ compatibility   │
│ strengths       │
│ challenges      │
└─────────────────┘

┌─────────────────┐
│   HR_RULES      │
│─────────────────│
│ id (PK)         │
│ job_id (FK)     │ (nullable - applies to all if null)
│ rule_text       │
│ rule_type       │
│ extracted_      │
│   keywords      │
│ is_active       │
│ is_temporary    │
│ created_by (FK) │
└─────────────────┘

┌─────────────────┐
│  AI_SETTINGS    │
│─────────────────│
│ id (PK)         │
│ provider        │
│ api_key         │
│ enable_skill_   │
│   explanation   │
│ enable_learning_│
│   recommendation│
│ enable_post_hire│
│   _prediction   │
│ temperature     │
│ max_tokens      │
└─────────────────┘
```

## Relationships Summary

| Parent Table | Child Table | Relationship | Foreign Key |
|-------------|-------------|--------------|-------------|
| users | jobs | 1:N | jobs.created_by → users.id |
| users | hiring_decisions | 1:N | hiring_decisions.decided_by → users.id |
| jobs | candidates | 1:N | candidates.job_id → jobs.id |
| candidates | interviews | 1:N | interviews.candidate_id → candidates.id |
| candidates | hiring_decisions | 1:1 | hiring_decisions.candidate_id → candidates.id |
| candidates | learning_paths | 1:N | learning_paths.candidate_id → candidates.id |
| candidates | success_predictions | 1:1 | success_predictions.candidate_id → candidates.id |
| candidates | team_compatibility | 1:N | team_compatibility.candidate_id → candidates.id |
| jobs | hr_rules | 1:N | hr_rules.job_id → jobs.id (nullable) |

## Key Constraints

### Primary Keys
- All tables have auto-incrementing integer `id` as PK

### Unique Constraints
- `users.email` - UNIQUE
- `hiring_decisions.candidate_id` - UNIQUE (one decision per candidate)

### Foreign Key Constraints
- All FK relationships have ON DELETE CASCADE (except users)
- Deleting a job deletes all its candidates
- Deleting a candidate deletes all related data

### Indexes
- `candidates.job_id` - Indexed for fast job-based queries
- `candidates.email` - Indexed for duplicate checks
- `candidates.status` - Indexed for filtering
- `candidates.overall_score` - Indexed for sorting

## Data Flow

```
1. HR creates JOB
2. Candidate applies → CANDIDATE created
3. Resume uploaded → resume_text stored in CANDIDATE
4. NLP extracts skills → extracted_skills updated
5. Scoring runs → overall_score calculated
6. HR creates HR_RULE
7. Rules applied → candidates filtered
8. (Optional) AI generates insights → LEARNING_PATHS, SUCCESS_PREDICTIONS
9. HR makes decision → HIRING_DECISION created
10. Candidate status updated → HIRED or REJECTED
```

## Sample Queries

### Get all candidates for a job with scores
```sql
SELECT c.id, c.first_name, c.last_name, c.overall_score, c.status
FROM candidates c
WHERE c.job_id = 1
ORDER BY c.overall_score DESC;
```

### Get candidates filtered by active HR rules
```sql
SELECT c.*
FROM candidates c
WHERE c.job_id = 1
  AND c.status != 'rejected'
  AND NOT EXISTS (
    SELECT 1 FROM hr_rules hr
    WHERE hr.is_active = TRUE
      AND (hr.job_id = 1 OR hr.job_id IS NULL)
      AND hr.rule_type = 'exclude'
      AND JSON_CONTAINS(c.extracted_skills, JSON_ARRAY(hr.extracted_keywords))
  );
```

### Get hiring decision stats
```sql
SELECT 
  decision,
  COUNT(*) as count,
  AVG(system_score) as avg_score
FROM hiring_decisions
GROUP BY decision;
```

### Get candidates with AI predictions
```sql
SELECT 
  c.first_name,
  c.last_name,
  c.overall_score,
  sp.success_score,
  sp.performance_prediction
FROM candidates c
LEFT JOIN success_predictions sp ON c.id = sp.candidate_id
WHERE c.job_id = 1;
```

## Normalization

The database follows **3NF (Third Normal Form)**:

1. **1NF:** All columns contain atomic values
2. **2NF:** No partial dependencies (all non-key attributes depend on entire PK)
3. **3NF:** No transitive dependencies

**Example:**
- Candidate name is stored in candidates table, not repeated in interviews
- Job details stored in jobs table, referenced by FK in candidates
- AI settings stored separately, not duplicated per candidate

## JSON Columns

Some columns use JSON for flexibility:

- `jobs.required_skills` - Array of strings
- `jobs.preferred_skills` - Array of strings
- `candidates.extracted_skills` - Array of strings
- `candidates.education` - Array of objects
- `learning_paths.recommended_courses` - Array of objects
- `success_predictions.positive_factors` - Array of strings

**Why JSON?**
- Flexible skill lists (no separate skills table needed)
- Easy to query with JSON functions
- Simpler schema for MVP

## Scalability Considerations

**Current Design (Good for 10,000 candidates):**
- Single MySQL instance
- JSON columns for flexibility

**Future Scaling (100,000+ candidates):**
- Separate `skills` table with many-to-many relationship
- Elasticsearch for full-text resume search
- Redis cache for frequently accessed data
- Read replicas for reporting queries

## Security

- Passwords hashed with bcrypt
- API keys encrypted in AI_SETTINGS
- Soft deletes for audit trail (is_active flags)
- Row-level security via created_by FK

---

## One-Line Summary

> "The database stores jobs, candidates, resumes, screening results, HR rules, and AI insights in a normalized schema with clear relationships, ensuring data integrity and efficient queries."
