from app.database import SessionLocal
from app import models
from app.services.auth_service import get_password_hash

db = SessionLocal()
user = db.query(models.User).filter(models.User.email == "ishur3894@gmail.com").first()

if user:
    user.hashed_password = get_password_hash("password123")
    user.role = models.UserRole.ADMIN
    db.commit()
    print(f"Password reset for {user.email} to 'password123' and role set to ADMIN")
else:
    # If user doesn't exist, create it
    new_user = models.User(
        email="ishur3894@gmail.com",
        hashed_password=get_password_hash("password123"),
        full_name="Admin User",
        role=models.UserRole.ADMIN
    )
    db.add(new_user)
    db.commit()
    print("Created new admin user: ishur3894@gmail.com / password123")

db.close()
