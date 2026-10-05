import sqlite3
conn = sqlite3.connect('hiring_system.db')
cursor = conn.cursor()
cursor.execute("SELECT id, title, status FROM jobs")
for row in cursor.fetchall():
    print(row)
conn.close()
