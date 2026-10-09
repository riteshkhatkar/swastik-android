from fastapi import HTTPException
from app.config.database import get_db
from app.utils.auth import get_password_hash, verify_password
from app.schemas.doctor_settings import DoctorProfileUpdate, PasswordChangeRequest, CustomQuestionsUpdate
from bson import ObjectId
from typing import Dict, Any, List

async def get_doctor_profile(username: str):
    db = get_db()
    
    # Get user info
    user = await db["users"].find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Get doctor info (if exists)
    doctor = await db["doctors"].find_one({"name": user.get("full_name")})
    
    return {
        "full_name": user.get("full_name"),
        "email": user.get("email"),
        "phone": user.get("phone") or (doctor.get("phone") if doctor else ""),
        "specialization": doctor.get("specialization") if doctor else "",
        "qualification": doctor.get("qualification") if doctor else "",
        "department": doctor.get("department") if doctor else ""
    }

async def update_doctor_profile(username: str, data: DoctorProfileUpdate):
    db = get_db()
    
    user = await db["users"].find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_full_name = user.get("full_name")
    
    # Update user collection
    user_updates = {}
    if data.full_name is not None: user_updates["full_name"] = data.full_name
    if data.email is not None: user_updates["email"] = data.email
    if data.phone is not None: user_updates["phone"] = data.phone
    
    if user_updates:
        await db["users"].update_one({"username": username}, {"$set": user_updates})
        
    # Update doctors collection
    doctor_updates = {}
    if data.full_name is not None: doctor_updates["name"] = data.full_name
    if data.email is not None: doctor_updates["email"] = data.email
    if data.phone is not None: doctor_updates["phone"] = data.phone
    if data.specialization is not None: doctor_updates["specialization"] = data.specialization
    if data.qualification is not None: doctor_updates["qualification"] = data.qualification
    if data.department is not None: doctor_updates["department"] = data.department
    
    if doctor_updates:
        # Try to find by old name first, then by email if not found
        res = await db["doctors"].update_one({"name": old_full_name}, {"$set": doctor_updates})
        if res.matched_count == 0 and data.email:
             await db["doctors"].update_one({"email": data.email}, {"$set": doctor_updates})

    return {"message": "Profile updated successfully"}

async def change_password(username: str, data: PasswordChangeRequest):
    db = get_db()
    user = await db["users"].find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(data.current_password, user.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    hashed_pass = get_password_hash(data.new_password)
    await db["users"].update_one({"username": username}, {"$set": {"hashed_password": hashed_pass}})
    
    return {"message": "Password changed successfully"}

async def get_custom_questions(username: str):
    db = get_db()
    user = await db["users"].find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    questions = user.get("custom_checklist_questions", [])
    return {"questions": questions}

async def update_custom_questions(username: str, data: CustomQuestionsUpdate):
    db = get_db()
    user = await db["users"].find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    serialized = [q.dict() for q in data.questions]
    await db["users"].update_one(
        {"username": username},
        {"$set": {"custom_checklist_questions": serialized}}
    )
    return {"message": "Custom questions updated", "questions": serialized}
