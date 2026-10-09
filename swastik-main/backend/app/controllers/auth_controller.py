from datetime import datetime
from fastapi import HTTPException
from app.config.database import get_db
from app.utils.auth import verify_password, create_access_token
from app.utils.auth import get_password_hash
from app.schemas.auth import LoginRequest, UserCreate


async def get_user_by_id_or_email(identifier: str):
    db = get_db()
    clean_identifier = identifier.strip()
    user = await db["users"].find_one({
        "$or": [
            {"username": clean_identifier},
            {"email": clean_identifier},
            {"phone": clean_identifier}
        ]
    })
    return user



async def login_user(credentials: LoginRequest, ip: str = "-"):
    user = await get_user_by_id_or_email(credentials.username)
    if not user or not verify_password(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Block deactivated accounts
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Account deactivated. Contact administrator.")

    token = create_access_token(data={
        "sub": user["username"],
        "id": str(user["_id"]),
        "role": user.get("role", "user"),
        "full_name": user.get("full_name")
    })
    user_response = {
        "id": str(user["_id"]),
        "username": user["username"],
        "full_name": user.get("full_name"),
        "role": user.get("role", "user"),
        "phone": user.get("phone"),
    }
    # For patients, include phone from patients collection so SMS and forms can use it
    if user.get("role") == "patient":
        try:
            from app.controllers.registration_controller import get_patient_by_uhid
            patient = await get_patient_by_uhid(user["username"])
            if patient and patient.get("phone"):
                user_response["phone"] = patient.get("phone")
        except Exception:
            pass

    # Log login event to activity log
    try:
        db = get_db()
        await db["activity_logs"].insert_one({
            "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "user": user["username"],
            "module": "Auth",
            "action": f"LOGIN — role: {user.get('role', 'user')}",
            "ip": ip,
        })
    except Exception:
        pass

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_response,
    }


async def create_user(data: UserCreate):
    db = get_db()
    existing = await db["users"].find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    from bson import ObjectId
    doc = {
        "username": data.username,
        "hashed_password": get_password_hash(data.password),
        "email": data.email,
        "full_name": data.full_name,
        "role": data.role or "user",
    }
    result = await db["users"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


async def ensure_default_user():
    """Create default users if they don't exist or migrate missing fields."""
    db = get_db()
    from app.utils.auth import get_password_hash
    allowed_emails = ["vaishali@ova.ngo", "suryawanshiprerana107@gmail.com", "vaishali@orelse.ai"]
    default_users = [
        {"username": "admin", "password": "admin123", "full_name": "Administrator", "role": "admin", "email": "vaishali@ova.ngo", "allowed_emails": allowed_emails},
        {"username": "pmchougule", "password": "pm@123", "full_name": "Dr. P. M. Chougule", "role": "doctor", "email": "vaishali@ova.ngo", "allowed_emails": allowed_emails},
        {"username": "nikhilchougule", "password": "nk@123", "full_name": "Dr. Nikhil Chougule", "role": "doctor", "email": "vaishali@ova.ngo", "allowed_emails": allowed_emails},
        {"username": "receptionist", "password": "receptionist123", "full_name": "Front Desk", "role": "receptionist", "email": "vaishali@ova.ngo", "allowed_emails": allowed_emails},
        {"username": "lab", "password": "lab123", "full_name": "Laboratory Technician", "role": "lab_technician", "email": "vaishali@ova.ngo", "allowed_emails": allowed_emails},
        {"username": "billing", "password": "billing123", "full_name": "Billing Admin", "role": "billing", "email": "vaishali@ova.ngo", "allowed_emails": allowed_emails}
    ]
    
    for u in default_users:
        # Check if user exists first so we don't overwrite passwords if they changed them
        existing = await db["users"].find_one({"username": u["username"]})
        if not existing:
            try:
                await db["users"].insert_one({
                    "username": u["username"],
                    "hashed_password": get_password_hash(u["password"]),
                    "full_name": u["full_name"],
                    "role": u["role"],
                    "email": u["email"],
                    "allowed_emails": u["allowed_emails"],
                })
            except Exception:
                pass
        else:
            # Migration: Update existing user to set email and allowed_emails
            try:
                await db["users"].update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"email": u["email"], "allowed_emails": u["allowed_emails"]}}
                )
            except Exception:
                pass


async def login_google_user(id_token_str: str, role: str, ip: str = "-"):
    import os
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_ID_ANDROID = os.getenv("GOOGLE_CLIENT_ID_ANDROID", "712569697364-5cmkrf6v6g85dk5o5s5qnfeokop2u0f8.apps.googleusercontent.com")
    allowed_clients = [c for c in [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID_ANDROID] if c]
    if not allowed_clients:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID environment variable is not configured.")

    try:
        idinfo = None
        last_err = None
        for cid in allowed_clients:
            try:
                idinfo = id_token.verify_oauth2_token(
                    id_token_str, 
                    google_requests.Request(), 
                    cid
                )
                break
            except Exception as err:
                last_err = err

        if not idinfo:
            raise HTTPException(status_code=400, detail=f"Google token verification failed: {last_err}")
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google ID token: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google token verification failed: {e}")

    # Extract verified email
    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided in Google ID token.")

    # Normalize role string
    db_role = role
    if role == "lab":
        db_role = "lab_technician"

    # Look up user by email or allowed_emails list and role in MongoDB users collection
    db = get_db()
    user = await db["users"].find_one({
        "role": db_role,
        "$or": [
            {"email": email},
            {"allowed_emails": email}
        ]
    })
    if not user:
        raise HTTPException(
            status_code=403, 
            detail=f"No account found for this email with role '{role}'. Please contact the administrator."
        )

    # Block deactivated accounts
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Account deactivated. Contact administrator.")

    # Issue access token
    token = create_access_token(data={
        "sub": user["username"],
        "id": str(user["_id"]),
        "role": user.get("role", "user"),
        "full_name": user.get("full_name")
    })
    user_response = {
        "id": str(user["_id"]),
        "username": user["username"],
        "full_name": user.get("full_name"),
        "role": user.get("role", "user"),
        "phone": user.get("phone"),
    }

    # For patients, include phone
    if user.get("role") == "patient":
        try:
            from app.controllers.registration_controller import get_patient_by_uhid
            patient = await get_patient_by_uhid(user["username"])
            if patient and patient.get("phone"):
                user_response["phone"] = patient.get("phone")
        except Exception:
            pass

    # Log login event
    try:
        await db["activity_logs"].insert_one({
            "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "user": user["username"],
            "module": "Auth",
            "action": f"GOOGLE LOGIN — role: {user.get('role', 'user')}",
            "ip": ip,
        })
    except Exception:
        pass

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_response,
    }

