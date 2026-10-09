from datetime import datetime
from app.config.database import get_db
from fastapi import HTTPException
from bson import ObjectId

# Collection: consultation_sessions
# Fields: patient_id, doctor_id, doctor_name, session_status, locked_at, unlocked_at

def _oid(s: str):
    try:
        return ObjectId(s)
    except:
        return None

async def start_session(patient_id: str, doctor_id: str, doctor_name: str):
    db = get_db()
    
    # Check if there's an active session for this patient
    existing = await db["consultation_sessions"].find_one({
        "patient_id": patient_id,
        "session_status": "active"
    })
    
    if existing:
        if str(existing["doctor_id"]) == str(doctor_id):
            return existing # Already started by this doctor
        raise HTTPException(
            status_code=403, 
            detail=f"Patient is already being consulted by {existing.get('doctor_name', 'another doctor')}"
        )

    session_doc = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "session_status": "active",
        "locked_at": datetime.utcnow(),
        "unlocked_at": None
    }
    
    result = await db["consultation_sessions"].insert_one(session_doc)
    session_doc["_id"] = str(result.inserted_id)
    return session_doc

async def end_session(patient_id: str, doctor_id: str):
    db = get_db()
    
    result = await db["consultation_sessions"].update_one(
        {
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "session_status": "active"
        },
        {
            "$set": {
                "session_status": "completed",
                "unlocked_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        # Check if it was actually locked by someone else
        existing = await db["consultation_sessions"].find_one({
            "patient_id": patient_id,
            "session_status": "active"
        })
        if existing:
             raise HTTPException(status_code=403, detail=f"Cannot end session locked by {existing.get('doctor_name')}")
        
    return {"message": "Session released"}

async def get_session_status(patient_id: str):
    db = get_db()
    session = await db["consultation_sessions"].find_one({
        "patient_id": patient_id,
        "session_status": "active"
    })
    
    if session:
        return {
            "locked": True,
            "locked_by": session.get("doctor_name"),
            "doctor_id": str(session.get("doctor_id")),
            "locked_at": session.get("locked_at")
        }
    
    return {"locked": False}

async def list_active_sessions():
    db = get_db()
    cursor = db["consultation_sessions"].find({"session_status": "active"})
    sessions = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        sessions.append(s)
    return sessions
