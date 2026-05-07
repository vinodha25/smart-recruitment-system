
import sqlite3

def add_column():
    conn = sqlite3.connect('hiring_system.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE candidates ADD COLUMN recruiter_name TEXT")
        print("Column recruiter_name added successfully.")
    except sqlite3.OperationalError as e:
        print(f"Column likely exists: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_column()
