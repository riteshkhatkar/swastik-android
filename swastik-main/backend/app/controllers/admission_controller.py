from app.config.database import get_db
from app.schemas.admission import AdmissionCreate, AdmissionUpdate
from app.controllers import room_controller, admin_controller, billing_controller
from bson import ObjectId
from datetime import datetime
from fastapi import HTTPException

ADMISSIONS_COLLECTION = "admissions"

async def admit_patient(data: AdmissionCreate):
    db = get_db()
    
    # 1. Verify patient exists
    patient = await db["patients"].find_one({"uhid": data.uhid})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient UHID not found")
    
    # 2. Verify room availability
    room = await room_controller.get_room_by_id(data.room_id)
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["status"] != "Available":
        raise HTTPException(status_code=400, detail="Room is not available")
    
    # 3. Create Admission Record
    doc = data.dict()
    doc["status"] = "admitted"
    doc["clinical_status"] = "Under Observation" # Default for new admissions
    doc["created_at"] = datetime.utcnow()
    doc["patient_id"] = str(patient["_id"])
    doc["patient_name"] = patient["name"]
    doc["room_number"] = room["room_number"]
    
    result = await db[ADMISSIONS_COLLECTION].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    
    # 4. Update Room Status
    await room_controller.update_room_status(data.room_id, "Occupied")
    
    # 5. Create Initial Billing Record
    total_service_charges = data.deposit + room["price_per_day"] + 500 # Deposit + 1 day room + nursing
    billing_data = {
        "uhid": data.uhid,
        "patient_id": str(patient["_id"]),
        "patient_name": patient["name"],
        "admission_id": doc["_id"],
        "subtotal": float(total_service_charges),
        "total": float(total_service_charges),
        "insurance_covered": 0.0,
        "patient_payable": float(total_service_charges),
        "due_amount": float(total_service_charges),
        "items": [
            {"category": "Admission", "item_name": "Admission Deposit", "quantity": 1, "price": float(data.deposit), "tax": 0, "total": float(data.deposit)},
            {"category": "Room", "item_name": f"Room Fee ({room['room_type']} - {room['room_number']})", "quantity": 1, "price": float(room["price_per_day"]), "tax": 0, "total": float(room["price_per_day"])},
            {"category": "Services", "item_name": "Nursing Service Fee", "quantity": 1, "price": 500, "tax": 0, "total": 500},
        ],
        "status": "Pending",
        "created_by": "System/Admission"
    }
    await billing_controller.create_bill(billing_data)
    
    # 6. Log Activity
    await admin_controller.log_activity("System/Admission", "IPD", f"Admitted patient {patient['name']} to Room {room['room_number']}")
    
    return doc

async def get_admission_by_id(admission_id: str):
    db = get_db()
    doc = await db[ADMISSIONS_COLLECTION].find_one({"_id": ObjectId(admission_id)})
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    return doc

async def list_active_admissions():
    db = get_db()
    cursor = db[ADMISSIONS_COLLECTION].find({"status": "admitted"}).sort("admission_date", -1)
    admissions = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        admissions.append(doc)
    return admissions

async def update_admission(admission_id: str, data: AdmissionUpdate):
    db = get_db()
    
    # 1. Update Admission Record
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        return await get_admission_by_id(admission_id)
        
    update_data["updated_at"] = datetime.utcnow()
    
    await db[ADMISSIONS_COLLECTION].update_one(
        {"_id": ObjectId(admission_id)},
        {"$set": update_data}
    )
    return await get_admission_by_id(admission_id)

async def list_admissions_by_doctor(doctor_id: str):
    db = get_db()
    cursor = db[ADMISSIONS_COLLECTION].find({
        "doctor_id": doctor_id,
        "status": "admitted"
    }).sort("admission_date", -1)
    
    admissions = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        admissions.append(doc)
    return admissions

async def save_consent_file_url(uhid: str, file_url: str):
    """Attach a signed consent file URL to the most recent active admission for a given UHID."""
    db = get_db()
    admission = await db[ADMISSIONS_COLLECTION].find_one(
        {"uhid": uhid, "status": "admitted"},
        sort=[("created_at", -1)]
    )
    if not admission:
        # Fallback: attach to most recent admission regardless of status
        admission = await db[ADMISSIONS_COLLECTION].find_one(
            {"uhid": uhid},
            sort=[("created_at", -1)]
        )
    if not admission:
        raise HTTPException(status_code=404, detail="No admission found for this UHID")

    admission_id = str(admission["_id"])
    await db[ADMISSIONS_COLLECTION].update_one(
        {"_id": admission["_id"]},
        {"$set": {
            "consent_file_url": file_url,
            "consent_uploaded_at": datetime.utcnow()
        }}
    )
    await admin_controller.log_activity(
        "System/Admission", "Consent",
        f"Signed consent form uploaded for UHID: {uhid}"
    )
    return {"admission_id": admission_id}

async def get_consent_info(uhid: str):
    """Return consent file URL and upload timestamp for a UHID's latest admission."""
    db = get_db()
    admission = await db[ADMISSIONS_COLLECTION].find_one(
        {"uhid": uhid},
        sort=[("created_at", -1)]
    )
    if not admission:
        raise HTTPException(status_code=404, detail="No admission found for this UHID")
    return {
        "admission_id": str(admission["_id"]),
        "consent_file_url": admission.get("consent_file_url"),
        "consent_uploaded_at": admission.get("consent_uploaded_at"),
    }
