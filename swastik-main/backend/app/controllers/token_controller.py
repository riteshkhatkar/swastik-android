from fastapi import HTTPException
from app.config.database import get_db
from datetime import datetime, time
from bson import ObjectId

async def generate_token(patient_id: str, doctor_id: str, appointment_id: str = None, date_str: str | None = None):
    db = get_db()
    
    # Get current date start and end
    now = datetime.utcnow()
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            target_date = now.date()
    else:
        target_date = now.date()

    today_start = datetime.combine(target_date, time.min)
    today_end = datetime.combine(target_date, time.max)
    
    # Find the latest token generated for this target date
    latest_token = await db["tokens"].find_one(
        {"created_at": {"$gte": today_start, "$lte": today_end}},
        sort=[("token_number", -1)]
    )
    
    next_num = 1
    if latest_token:
        # Extract number from Txxx
        try:
            last_token_num = int(latest_token["token_number"][1:])
            next_num = last_token_num + 1
        except (ValueError, IndexError):
            pass
            
    token_number = f"T{next_num:03d}"
    
    doc = {
        "token_number": token_number,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "appointment_id": appointment_id,
        "status": "waiting",
        "created_at": datetime.combine(target_date, now.time()) if date_str else now
    }
    
    result = await db["tokens"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

async def get_doctor_queue(doctor_id: str):
    db = get_db()
    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), time.min)
    
    cursor = db["tokens"].find({
        "doctor_id": doctor_id,
        "created_at": {"$gte": today_start},
        "status": {"$in": ["waiting", "in_consultation"]}
    }).sort("token_number", 1)
    
    tokens = []
    async for t in cursor:
        t["_id"] = str(t["_id"])
        # Fetch patient name for convenience
        patient = await db["patients"].find_one({"uhid": t["patient_id"]})
        if not patient:
            # Try searching by _id if UHID fails (though plan says patient_id)
            try:
                patient = await db["patients"].find_one({"_id": ObjectId(t["patient_id"])})
            except:
                pass
        t["patient_name"] = patient.get("name") if patient else "Unknown"
        tokens.append(t)
    return tokens

async def update_token_status(token_id: str, status: str):
    db = get_db()
    result = await db["tokens"].find_one_and_update(
        {"_id": ObjectId(token_id)},
        {"$set": {"status": status}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Token not found")
    result["_id"] = str(result["_id"])
    return result

async def get_all_tokens_today():
    db = get_db()
    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), time.min)
    
    cursor = db["tokens"].find({"created_at": {"$gte": today_start}}).sort("token_number", -1)
    tokens = []
    async for t in cursor:
        t["_id"] = str(t["_id"])
        # Fetch patient and doctor names
        patient = await db["patients"].find_one({"uhid": t["patient_id"]})
        if not patient:
            try: patient = await db["patients"].find_one({"_id": ObjectId(t["patient_id"])})
            except: pass
            
        doctor = await db["doctors"].find_one({"_id": ObjectId(t["doctor_id"])})
        
        t["patient_name"] = patient.get("name") if patient else "Unknown"
        t["doctor_name"] = doctor.get("name") if doctor else "Unknown"
        tokens.append(t)
    return tokens

async def get_token_by_appointment(appointment_id: str):
    db = get_db()
    token = await db["tokens"].find_one({"appointment_id": appointment_id})
    if token:
        token["_id"] = str(token["_id"])
    return token
