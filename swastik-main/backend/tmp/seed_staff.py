import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.controllers import auth_controller
from app.schemas.auth import UserCreate
from app.config.database import connect_to_mongo, get_db

async def seed():
    print("--- Seeding Default Staff Users ---")
    await connect_to_mongo()
    db = get_db()
    
    staff_users = [
        {"username": "admin", "password": "admin123", "role": "admin", "full_name": "System Administrator"},
        {"username": "receptionist", "password": "receptionist123", "role": "receptionist", "full_name": "Hospital Receptionist"},
        {"username": "doctor", "password": "doctor123", "role": "doctor", "full_name": "Medical Doctor"},
        {"username": "lab", "password": "lab123", "role": "lab", "full_name": "Lab Assistant"},
        {"username": "billing", "password": "billing123", "role": "billing", "full_name": "Billing Officer"}
    ]
    
    for user_data in staff_users:
        # Check if user already exists
        existing = await db["users"].find_one({"username": user_data["username"]})
        if not existing:
            try:
                await auth_controller.create_user(UserCreate(
                    username=user_data["username"],
                    password=user_data["password"],
                    role=user_data["role"],
                    full_name=user_data["full_name"]
                ))
                print(f"Created user: {user_data['username']} (Role: {user_data['role']})")
            except Exception as e:
                print(f"Error creating user {user_data['username']}: {e}")
        else:
            print(f"User {user_data['username']} already exists.")

if __name__ == "__main__":
    asyncio.run(seed())
