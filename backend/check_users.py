from app.database import SessionLocal
from app import models

db = SessionLocal()
users = db.query(models.User).all()

print(f"{'ID':<5} {'Email':<30} {'Full Name':<25} {'Role':<10}")
print("-" * 75)

for user in users:
    print(f"{user.id:<5} {user.email:<30} {user.full_name:<25} {user.role:<10}")

db.close()
