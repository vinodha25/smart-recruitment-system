
import sqlite3
import pandas as pd

DB_PATH = "hiring_system.db"

def check_recent_candidates():
    conn = sqlite3.connect(DB_PATH)
    
    # Get last 5 candidates
    query = """
    SELECT id, first_name, last_name, email, job_id, overall_score, ai_recommendation, ai_insight, ai_analysis_json, applied_at, resume_file_path
    FROM candidates
    ORDER BY id DESC
    LIMIT 5
    """
    
    try:
        df = pd.read_sql_query(query, conn)
        print(df.to_string())
    except Exception as e:
        print(e)
    
    # Get all jobs
    print("\nJobs:")
    try:
        jobs_df = pd.read_sql_query("SELECT id, title FROM jobs", conn)
        print(jobs_df)
    except:
        pass
    
    conn.close()

if __name__ == "__main__":
    check_recent_candidates()
