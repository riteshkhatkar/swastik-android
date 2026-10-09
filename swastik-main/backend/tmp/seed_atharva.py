import asyncio
from app.config.database import connect_to_mongo, get_db, close_mongo
from datetime import datetime
from bson import ObjectId

async def seed_atharva():
    await connect_to_mongo()
    db = get_db()
    
    # 1. Find or create Atharva
    atharva = await db['patients'].find_one({'name': {'$regex': 'Atharva', '$options': 'i'}})
    if not atharva:
        uhid = "SWASTIK-2026-DEMO"
        atharva = {
            "name": "Atharva Demo",
            "uhid": uhid,
            "phone": "9876543210",
            "password": "password123", # For demo login
            "age": 25,
            "gender": "Male",
            "created_at": datetime.utcnow()
        }
        await db['patients'].insert_one(atharva)
        print(f"Created patient: {uhid}")
    else:
        uhid = atharva['uhid']
        print(f"Found patient: {uhid}")

    # 2. Add some appointments
    await db['appointments'].delete_many({"uhid": uhid})
    appointments = [
        {
            "uhid": uhid,
            "patient_name": "Atharva Demo",
            "appointment_date": "2026-03-05",
            "appointment_time": "10:30 AM",
            "type": "Consultation",
            "status": "scheduled",
            "created_at": datetime.utcnow()
        },
        {
            "uhid": uhid,
            "patient_name": "Atharva Demo",
            "appointment_date": "2026-02-28",
            "appointment_time": "02:00 PM",
            "type": "Therapy",
            "status": "completed",
            "created_at": datetime.utcnow()
        }
    ]
    await db['appointments'].insert_many(appointments)

    # 3. Add clinical history
    await db['clinical_records'].delete_many({"uhid": uhid})
    records = [
        {
            "uhid": uhid,
            "type": "Consultation",
            "created_at": datetime.utcnow(),
            "data": {
                "soap": {
                    "s": "Patient reports feeling better but still has occasional anxiety.",
                    "o": "Normal speech, logical thought process.",
                    "a": "Generalized Anxiety Disorder - Improving.",
                    "p": "Continue current medications. Start daily meditation.",
                    "daily_routine": "1. Wake up at 7 AM\n2. 15 mins Meditation\n3. Light Breakfast\n4. Morning Walk (30 mins)\n5. Evening Relaxation Techniques"
                }
            }
        },
        {
            "uhid": uhid,
            "type": "Rehab Session",
            "created_at": datetime.utcnow(),
            "data": {
                "shortTermGoals": "Improve social interaction",
                "therapyModalities": ["CBT", "Group Therapy"]
            }
        }
    ]
    await db['clinical_records'].insert_many(records)

    # 4. Add documents
    await db['patient_documents'].delete_many({"uhid": uhid})
    documents = [
        {
            "uhid": uhid,
            "document_name": "Blood Report - March",
            "category": "Lab Report",
            "uploaded_at": datetime.utcnow(),
            "file_type": "pdf"
        },
        {
            "uhid": uhid,
            "document_name": "Prescription - Feb 15",
            "category": "Prescription",
            "uploaded_at": datetime.utcnow(),
            "file_type": "pdf"
        }
    ]
    await db['patient_documents'].insert_many(documents)
    
    print("Demo data seeded successfully!")
    await close_mongo()

if __name__ == "__main__":
    asyncio.run(seed_atharva())
