"""
EduBridge AI — Seed Script
Creates demo users and optionally uploads the sample document.
Run: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.session import init_db, SessionLocal
from app.models.models import User
from app.core.security import hash_password

DEMO_USERS = [
    {
        "name": "Demo Student",
        "email": "demo_student@edubridge.ai",
        "password": "demo1234",
        "role": "student",
        "preferred_language": "mr",
    },
    {
        "name": "Demo Teacher",
        "email": "demo_teacher@edubridge.ai",
        "password": "demo1234",
        "role": "teacher",
        "preferred_language": "en",
    },
]


def seed():
    print("🌱 Seeding EduBridge AI database...")
    init_db()
    db = SessionLocal()

    for u in DEMO_USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            print(f"  ⏭  User already exists: {u['email']}")
            continue
        user = User(
            name=u["name"],
            email=u["email"],
            password_hash=hash_password(u["password"]),
            role=u["role"],
            preferred_language=u["preferred_language"],
        )
        db.add(user)
        print(f"  ✅ Created {u['role']}: {u['email']} / {u['password']}")

    db.commit()
    db.close()
    print("\n✅ Seeding complete!")
    print("\nDemo credentials:")
    for u in DEMO_USERS:
        print(f"  {u['role'].capitalize()}: {u['email']} / {u['password']}")


if __name__ == "__main__":
    seed()
