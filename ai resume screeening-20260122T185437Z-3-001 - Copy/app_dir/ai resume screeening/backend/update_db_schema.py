
import sqlite3
import os

DB_PATH = "hiring_system.db"

def upgrade_db():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(candidates)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "ai_analysis_json" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN ai_analysis_json JSON")
            conn.commit()

        if "intern_experience_years" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN intern_experience_years FLOAT DEFAULT 0.0")
            conn.commit()

        if "work_experience_years" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN work_experience_years FLOAT DEFAULT 0.0")
            conn.commit()

        if "internship_history" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN internship_history JSON")
            conn.commit()

        if "responsibility_match_score" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN responsibility_match_score FLOAT DEFAULT 0.0")
            conn.commit()

        if "preferred_match_score" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN preferred_match_score FLOAT DEFAULT 0.0")
            conn.commit()

        if "bonus_score" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN bonus_score FLOAT DEFAULT 0.0")
            conn.commit()

        if "ats_score" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN ats_score FLOAT DEFAULT 0.0")
            conn.commit()

        if "ats_breakdown" not in columns:
            cursor.execute("ALTER TABLE candidates ADD COLUMN ats_breakdown JSON")
            conn.commit()

        # Check Jobs table
        cursor.execute("PRAGMA table_info(jobs)")
        job_columns = [info[1] for info in cursor.fetchall()]
        
        if "max_experience_years" not in job_columns:
            cursor.execute("ALTER TABLE jobs ADD COLUMN max_experience_years INTEGER DEFAULT 0")
            conn.commit()

        if "min_education" not in job_columns:
            cursor.execute("ALTER TABLE jobs ADD COLUMN min_education TEXT")
            conn.commit()

        if "work_mode" not in job_columns:
            cursor.execute("ALTER TABLE jobs ADD COLUMN work_mode TEXT")
            conn.commit()

        if "role_level" not in job_columns:
            cursor.execute("ALTER TABLE jobs ADD COLUMN role_level TEXT")
            conn.commit()

        if "num_openings" not in job_columns:
            cursor.execute("ALTER TABLE jobs ADD COLUMN num_openings INTEGER DEFAULT 1")
            conn.commit()

        if "key_responsibilities" not in job_columns:
            cursor.execute("ALTER TABLE jobs ADD COLUMN key_responsibilities JSON")
            conn.commit()

        if "preferred_qualifications" not in job_columns:
            cursor.execute("ALTER TABLE jobs ADD COLUMN preferred_qualifications JSON")
            conn.commit()
            
        print("Schema update check complete.")
            
    except Exception as e:
        print(f"Error updating database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade_db()
