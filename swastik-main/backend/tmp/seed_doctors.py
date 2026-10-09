import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config.database import connect_to_mongo, get_db

async def seed():
    print("--- Checking and Seeding Doctors ---")
    await connect_to_mongo()
    db = get_db()
    
    # 1. Check existing doctors
    existing_docs = await db["doctors"].find().to_list(None)
    print(f"Found {len(existing_docs)} doctors in the database.")
    
    if len(existing_docs) == 0:
        print("Seeding default doctors...")
        doctors = [
            {
                "name": "Dr. P. M. Chougule",
                "specialization": "Psychiatrist",
                "qualification": "MBBS, DPM",
                "phone": "9876543210",
                "email": "pmchougule@example.com",
                "department": "Psychiatry"
            },
            {
                "name": "Dr. Nikhil Chougule",
                "specialization": "Therapist",
                "qualification": "MBBS, MD",
                "phone": "9876543211",
                "email": "nikhil@example.com",
                "department": "Psychotherapy"
            }
        ]
        result = await db["doctors"].insert_many(doctors)
        print(f"Successfully seeded {len(result.inserted_ids)} doctors.")
    else:
        print("Doctors already exist:")
        for doc in existing_docs:
            print(f"- {doc['name']} ({doc.get('specialization', 'No specialty')})")

if __name__ == "__main__":
    asyncio.run(seed())
