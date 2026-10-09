from app.config.database import get_db
from bson import ObjectId
from datetime import datetime
from app.controllers import admin_controller

async def save_consultation(uhid: str, consultation_data: dict):
    db = get_db()
    consultation_doc = {
        "uhid": uhid,
        "type": "Consultation",
        "data": consultation_data,
        "created_at": datetime.utcnow()
    }
    result = await db["clinical_records"].insert_one(consultation_doc)
    consultation_doc["_id"] = str(result.inserted_id)
    
    # Log activity
    await admin_controller.log_activity("System/Doctor", "Clinical", f"Saved consultation for UHID: {uhid}")
    
    return consultation_doc

async def save_prescription(uhid: str, prescription_data: dict):
    db = get_db()
    # Ensure medications is handled as a list of dicts
    meds = prescription_data.get("medications", [])
    if isinstance(meds, list):
        meds_data = meds
    else:
        meds_data = []

    prescription_doc = {
        "uhid": uhid,
        "type": "Prescription",
        "medications": meds_data,
        "doctor_id": prescription_data.get("doctor_id"),
        "doctor_name": prescription_data.get("doctor_name"),
        "patient_name": prescription_data.get("patient_name"), # Added patient_name
        "notes": prescription_data.get("notes"),
        "admission_id": prescription_data.get("admission_id"),
        "created_at": datetime.utcnow()
    }
    # Save to dedicated prescriptions collection as well as clinical_records
    result = await db["prescriptions"].insert_one(prescription_doc)
    prescription_doc["_id"] = str(result.inserted_id)
    
    # Also save to clinical_records for legacy/unified history
    clinical_doc = {
        "uhid": uhid,
        "type": "Prescription",
        "data": prescription_data,
        "created_at": datetime.utcnow()
    }
    await db["clinical_records"].insert_one(clinical_doc)
    
    # Log activity
    await admin_controller.log_activity("System/Doctor", "Clinical", f"Saved structured prescription for UHID: {uhid}")
    
    return _serialize_prescription(prescription_doc)

async def get_prescriptions(uhid: str = None, doctor_id: str = None, search: str = None):
    db = get_db()
    q = {}
    if uhid: q["uhid"] = uhid
    if doctor_id: q["doctor_id"] = doctor_id
    
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        q["$or"] = [
            {"uhid": search_regex},
            {"patient_name": search_regex},
            {"doctor_name": search_regex},
            {"medications.drug_name": search_regex}
        ]
    
    cursor = db["prescriptions"].find(q).sort("created_at", -1)
    out = []
    
    # Cache for patient names to avoid redundant DB hits
    patient_names = {}
    
    async for doc in cursor:
        p_doc = _serialize_prescription(doc)
        if not p_doc.get("patient_name") or p_doc.get("patient_name") == "Unknown Patient":
            uhid = p_doc.get("uhid")
            if uhid not in patient_names:
                # Try to find patient name in ipd_registrations or patients
                p_info = await db["ipd_registrations"].find_one({"uhid": uhid})
                if p_info:
                    patient_names[uhid] = p_info.get("patient_name")
            
            if patient_names.get(uhid):
                p_doc["patient_name"] = patient_names[uhid]
                
        out.append(p_doc)
    return out

def _serialize_prescription(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    
    # Ensure patient_name and uhid are always there for frontend
    if "patient_name" not in doc:
        doc["patient_name"] = "Unknown Patient"
    
    if "created_at" in doc and hasattr(doc["created_at"], "isoformat"):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

async def save_ipd_admission_details(uhid: str, admission_data: dict):
    db = get_db()
    # Update IPD registration with more details or create a clinical record
    await db["ipd_registrations"].update_one(
        {"uhid": uhid, "status": "admitted"},
        {"$set": {"admission_details": admission_data, "updated_at": datetime.utcnow()}}
    )
    
    # Also save as clinical record for history
    admission_data["uhid"] = uhid
    admission_data["type"] = "IPD Admission Details"
    admission_data["created_at"] = datetime.utcnow()
    await db["clinical_records"].insert_one(admission_data)
    
    # Log activity
    await admin_controller.log_activity("System/Doctor", "IPD", f"Saved admission details for UHID: {uhid}")
    
    return {"message": "Admission details saved"}

async def save_ipd_progress_note(uhid: str, note_data: dict):
    db = get_db()
    note_doc = {
        "uhid": uhid,
        "type": "IPD Progress Note",
        "data": note_data,
        "created_at": datetime.utcnow()
    }
    await db["clinical_records"].insert_one(note_doc)
    
    # Log activity
    await admin_controller.log_activity("System/Doctor", "IPD", f"Added progress note for UHID: {uhid}")
    
    return {"message": "Progress note saved"}

async def update_ipd_status(uhid: str, action: str, details: dict):
    db = get_db()
    update_data = {"updated_at": datetime.utcnow()}
    
    if action == "transfer":
        update_data["ward"] = details.get("ward")
        update_data["bed_number"] = details.get("bed_number")
        log_msg = f"Transferred UHID: {uhid} to {update_data['ward']} bed {update_data['bed_number']}"
    elif action == "discharge_initiate":
        update_data["status"] = "discharge_pending"
        log_msg = f"Initiated discharge for UHID: {uhid}"
    elif action == "complete_discharge":
        update_data["status"] = "discharged"
        update_data["discharged_at"] = datetime.utcnow()
        log_msg = f"Completed discharge for UHID: {uhid}"
    else:
        return None

    result = await db["ipd_registrations"].update_one(
        {"uhid": uhid, "status": {"$ne": "discharged"}},
        {"$set": update_data}
    )
    
    if result.modified_count > 0:
        await admin_controller.log_activity("System/Doctor", "IPD", log_msg)
        return {"message": "Status updated successfully"}
    return None

async def save_rehab_data(uhid: str, rehab_type: str, data: dict):
    db = get_db()
    rehab_doc = {
        "uhid": uhid,
        "type": f"Rehab {rehab_type}",
        "data": data,
        "created_at": datetime.utcnow()
    }
    await db["clinical_records"].insert_one(rehab_doc)
    
    # Log activity
    await admin_controller.log_activity("System/Doctor", "Rehab", f"Saved {rehab_type} data for UHID: {uhid}")
    
    return {"message": f"Rehab {rehab_type} data saved"}

async def save_daily_routine(uhid: str, routine_data: dict):
    db = get_db()
    routine_doc = {
        "uhid": uhid,
        "type": "Daily Routine",
        "data": routine_data,
        "created_at": datetime.utcnow()
    }
    await db["clinical_records"].insert_one(routine_doc)
    await admin_controller.log_activity("System/Doctor", "Clinical", f"Promoted daily routine for UHID: {uhid}")
    return {"message": "Daily routine shared with patient"}
async def get_clinical_history(uhid: str):
    db = get_db()
    cursor = db["clinical_records"].find({"uhid": uhid}).sort("created_at", -1)
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Format created_at for frontend if needed
        if "created_at" in doc and isinstance(doc["created_at"], datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        history.append(doc)
    return history
