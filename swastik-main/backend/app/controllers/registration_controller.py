from fastapi import HTTPException
from app.config.database import get_db
from app.controllers import admin_controller
from app.utils.uhid import generate_uhid
from app.schemas.registration import (
    PatientRegistrationCreate,
    OPDRegistrationCreate,
    IPDRegistrationCreate,
    DoctorRegistrationCreate,
    StaffRegistrationCreate,
    AppointmentCreate,
)
from datetime import datetime
from bson import ObjectId
from typing import Dict, Any


async def seed_doctors():
    db = get_db()
    doctors_to_seed = [
        {
            "name": "Dr. P. M. Chougule",
            "specialization": "Psychiatry",
            "qualification": "M.D. Psychological Med., D.P.M. (Mumbail M. B. F. L. P. S, M. A. P. A. (USA)",
            "phone": "9876543210",
            "email": "vaishali@ova.ngo",
            "department": "Psychiatry",
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Dr. Nikhil Chougule",
            "specialization": "Psychiatry",
            "qualification": "M.D. Psychiatry (Mumbai), M. D. Medicine (Russia)",
            "phone": "9876543211",
            "email": "vaishali@ova.ngo",
            "department": "Psychiatry",
            "created_at": datetime.utcnow(),
        }
    ]
    
    for doc in doctors_to_seed:
        await db["doctors"].update_one(
            {"name": doc["name"]},
            {"$set": doc},
            upsert=True
        )
        print(f"Seeded/Updated doctor: {doc['name']}")


async def create_patient(data: PatientRegistrationCreate):
    db = get_db()
    uhid = await generate_uhid()
    doc = {
        "uhid": uhid,
        "name": data.name,
        "age": data.age,
        "gender": data.gender,
        "phone": data.phone,
        "address": data.address,
        "email": data.email,
        "dob": data.dob,
        "password": data.password,
        
        # Guardian Info
        "guardian_name": data.guardian_name,
        "guardian_relation": data.guardian_relation,
        "guardian_contact": data.guardian_contact,
        "guardian_address": data.guardian_address,
        "guardian_id_type": data.guardian_id_type,
        "guardian_id_number": data.guardian_id_number,
        "guardian_consent": data.guardian_consent,
        
        # Emergency Contact
        "emergency_name": data.emergency_name,
        "emergency_relation": data.emergency_relation,
        "emergency_contact": data.emergency_contact,
        
        # Medical History
        "prev_psychiatric": data.prev_psychiatric,
        "on_medication": data.on_medication,
        "medication_details": data.medication_details,
        "substance_history": data.substance_history,
        "self_harm_history": data.self_harm_history,
        "violent_history": data.violent_history,
        
        # Visit & Insurance
        "visit_type": data.visit_type,
        "insurance_provider": data.insurance_provider,
        "policy_number": data.policy_number,
        "valid_till": data.valid_till,
        "self_pay": data.self_pay,
        
        "photo_base64": data.photo_base64,
        "created_at": datetime.utcnow(),
    }
    result = await db["patients"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # Create registration + case paper bill in central billing (live DB) for this UHID
    from app.controllers import billing_controller
    config = await admin_controller.get_system_config()
    consultation_fee = config.get("consultation_fee", 500)
    case_paper_fee = 100
    if data.visit_type == "Emergency":
        consultation_fee = consultation_fee * 2 # Standard practice: 2x for emergency
    elif data.visit_type == "Follow-up":
        consultation_fee = consultation_fee * 0.6 # Standard practice: 60% for follow-up
    total_bill = consultation_fee + case_paper_fee
    visit_label = (data.visit_type or "OPD").replace("_", " ")
    initial_bill = None
    try:
        initial_bill = await billing_controller.create_bill({
            "uhid": uhid,
            "patient_id": str(result.inserted_id),
            "patient_name": data.name,
            "subtotal": float(total_bill),
            "tax": 0,
            "discount": 0,
            "total": float(total_bill),
            "status": "Pending",
            "items": [
                {"category": "Consultation", "item_name": f"{visit_label} Consultation", "quantity": 1, "price": float(consultation_fee), "tax": 0, "total": float(consultation_fee)},
                {"category": "Consultation", "item_name": "Case Paper", "quantity": 1, "price": float(case_paper_fee), "tax": 0, "total": float(case_paper_fee)},
            ],
            "created_by": "System/Registration",
        })
    except Exception as e:
        print(f"Error creating registration bill for {uhid}: {e}")

    # Automatically create a user account for the patient
    # Username: UHID, Password: Phone Number (default)
    from app.controllers import auth_controller
    from app.schemas.auth import UserCreate
    
    try:
        user_data = UserCreate(
            username=uhid,
            password=data.password or data.phone or "swastik123", # Prioritize provided password
            email=data.email,
            full_name=data.name,
            role="patient"
        )
        await auth_controller.create_user(user_data)
    except Exception as e:
        # Log error but don't fail registration if user creation fails
        print(f"Error creating user for patient {uhid}: {e}")

    # Log activity
    await admin_controller.log_activity("System/Admin", "Registration", f"Registered new patient: {data.name} ({uhid})")

    # Send registration confirmation SMS
    try:
        from app.utils.sms_utils import send_registration_confirmation
        await send_registration_confirmation(
            patient_name=data.name,
            phone=data.phone,
            uhid=uhid,
            password=data.password or data.phone or "swastik123"
        )
    except Exception as e:
        print(f"Error sending registration SMS: {e}")

    # Notify Receptionist
    await create_notification(
        recipient_role="receptionist",
        title="New Patient Registered",
        message=f"Patient {data.name} ({uhid}) has been registered successfully.",
        type="info"
    )

    out = {**doc}
    if initial_bill:
        out["initial_bill"] = initial_bill
    return out


async def get_patient_by_uhid(uhid: str) -> Dict[str, Any] | None:
    db = get_db()
    patient = await db["patients"].find_one({"uhid": uhid})
    if not patient:
        return None
    patient["_id"] = str(patient["_id"])
    return patient


async def list_patients(skip: int = 0, limit: int = 100) -> list:
    db = get_db()
    cursor = db["patients"].find().sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items


async def create_opd_registration(data: OPDRegistrationCreate):
    patient = await get_patient_by_uhid(data.uhid)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient UHID not found. Register patient first.")
    db = get_db()
    doc = {
        "uhid": data.uhid,
        "patient_name": data.patient_name or patient.get("name"),
        "department": data.department,
        "doctor_id": data.doctor_id,
        "visit_type": data.visit_type or "OPD",
        "notes": data.notes,
        "created_at": datetime.utcnow(),
    }
    result = await db["opd_registrations"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # Log activity
    await admin_controller.log_activity("System/Admin", "OPD", f"Registered OPD visit for {doc['patient_name']} ({data.uhid})")

    # Notify Receptionist
    await create_notification(
        recipient_role="receptionist",
        title="New OPD Visit",
        message=f"OPD registration completed for {doc['patient_name']} ({data.uhid}).",
        type="appointment"
    )

    return doc


async def create_ipd_registration(data: IPDRegistrationCreate):
    patient = await get_patient_by_uhid(data.uhid)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient UHID not found. Register patient first.")
    
    db = get_db()
    
    # Bed Allocation Logic
    bed = None
    if data.bed_id:
        bed = await db["beds"].find_one({"_id": ObjectId(data.bed_id)})
        if not bed:
            raise HTTPException(status_code=404, detail="Bed not found")
        if bed.get("is_occupied"):
            raise HTTPException(status_code=400, detail="Bed is already occupied")
            
        # Update Bed Status
        await db["beds"].update_one(
            {"_id": ObjectId(data.bed_id)},
            {"$set": {"is_occupied": True, "patient_id": str(patient["_id"]), "uhid": data.uhid}}
        )

    doc = {
        "uhid": data.uhid,
        "patient_name": data.patient_name or patient.get("name"),
        "ward": data.ward or (bed.get("ward_type") if bed else None),
        "bed_id": data.bed_id,
        "bed_number": data.bed_number or (bed.get("bed_number") if bed else None),
        "admission_reason": data.admission_reason,
        "admitted_by": data.admitted_by,
        "deposit": data.deposit,
        "notes": data.notes,
        "created_at": datetime.utcnow(),
        "status": "admitted",
    }
    result = await db["ipd_registrations"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # Automated IPD Billing
    from app.controllers import billing_controller
    
    ward_type = doc["ward"]
    config = await admin_controller.get_system_config()
    base_bed_fee = 2000 # General default
    if ward_type == "Private Room":
        base_bed_fee = 5000
    elif ward_type == "Observation Ward":
        base_bed_fee = 3000
    
    nursing_fee = 500
    deposit = float(data.deposit or config.get("admission_deposit", 5000))
    
    total_bill = deposit + base_bed_fee + nursing_fee
    
    try:
        await billing_controller.create_bill({
            "uhid": data.uhid,
            "patient_id": str(patient["_id"]),
            "patient_name": doc["patient_name"],
            "subtotal": float(total_bill),
            "total": float(total_bill),
            "items": [
                {"description": f"Admission Deposit", "amount": deposit},
                {"description": f"IPD Bed Fee ({ward_type})", "amount": float(base_bed_fee)},
                {"description": "Nursing Service Fee", "amount": float(nursing_fee)}
            ],
            "status": "unpaid",
            "created_by": data.admitted_by or "System/IPD"
        })
    except Exception as e:
        print(f"Error creating IPD bill for {data.uhid}: {e}")

    # Log activity
    await admin_controller.log_activity(data.admitted_by or "System/Admin", "IPD", f"Admitted patient {doc['patient_name']} to {doc['ward']} Bed {doc['bed_number']}")

    # Notify Receptionist
    await create_notification(
        recipient_role="receptionist",
        title="New IPD Admission",
        message=f"Patient {doc['patient_name']} admitted to {doc['ward']} (Bed: {doc['bed_number']}).",
        type="medical"
    )

    return doc


async def get_beds(ward_type: str | None = None, status: str | None = None):
    db = get_db()
    q: Dict[str, Any] = {}
    if ward_type:
        q["ward_type"] = ward_type
    
    if status == "Available":
        q["is_occupied"] = False
    elif status == "Occupied":
        q["is_occupied"] = True
    
    # Ensure beds exist (auto-seed if empty for demo/dev)
    count = await db["beds"].count_documents({})
    if count == 0:
        await seed_beds()
        
    cursor = db["beds"].find(q)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items


async def seed_beds():
    db = get_db()
    beds_to_seed = []
    
    # General Ward: G-101 to G-140 (₹1,500/day)
    for i in range(1, 41):
        beds_to_seed.append({
            "bed_number": f"G-{100 + i}",
            "ward_type": "General",
            "price_per_day": 1500,
            "is_occupied": False
        })
        
    # Private Ward: P-201 to P-240 (₹4,500/day)
    for i in range(1, 41):
        beds_to_seed.append({
            "bed_number": f"P-{200 + i}",
            "ward_type": "Private",
            "price_per_day": 4500,
            "is_occupied": False
        })
        
    # ICU Ward: I-301 to I-340 (₹8,500/day)
    for i in range(1, 41):
        beds_to_seed.append({
            "bed_number": f"I-{300 + i}",
            "ward_type": "ICU",
            "price_per_day": 8500,
            "is_occupied": False
        })
    
    for bed in beds_to_seed:
        await db["beds"].update_one(
            {"bed_number": bed["bed_number"]},
            {"$set": bed},
            upsert=True
        )
    print(f"Seeded {len(beds_to_seed)} beds across General, Private, and ICU wards.")


async def create_doctor(data: DoctorRegistrationCreate):
    db = get_db()
    doc = {
        "name": data.name,
        "specialization": data.specialization,
        "qualification": data.qualification,
        "phone": data.phone,
        "email": data.email,
        "department": data.department,
        "created_at": datetime.utcnow(),
    }
    result = await db["doctors"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


async def create_staff(data: StaffRegistrationCreate):
    db = get_db()
    doc = {
        "name": data.name,
        "role": data.role,
        "department": data.department,
        "phone": data.phone,
        "email": data.email,
        "created_at": datetime.utcnow(),
    }
    result = await db["staff"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc



async def list_opd(skip: int = 0, limit: int = 100):
    db = get_db()
    cursor = db["opd_registrations"].find().sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items


async def list_ipd(skip: int = 0, limit: int = 100):
    db = get_db()
    
    # Fetch from legacy ipd_registrations
    legacy_cursor = db["ipd_registrations"].find({"status": "admitted"}).sort("created_at", -1)
    legacy_items = []
    async for doc in legacy_cursor:
        doc["_id"] = str(doc["_id"])
        legacy_items.append(doc)
        
    # Fetch from new admissions collection
    new_cursor = db["admissions"].find({"status": "admitted"}).sort("created_at", -1)
    new_items = []
    async for doc in new_cursor:
        doc["_id"] = str(doc["_id"])
        # Map admission_date to created_at if created_at is missing for legacy sorting compatibility
        if "created_at" not in doc and "admission_date" in doc:
            doc["created_at"] = doc["admission_date"]
        new_items.append(doc)
        
    combined = legacy_items + new_items
    
    # Sort combined list by created_at descending
    combined.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return combined[skip : skip + limit]






async def get_dashboard_counts():
    db = get_db()
    patients = await db["patients"].count_documents({})
    opd = await db["opd_registrations"].count_documents({})
    ipd = await db["ipd_registrations"].count_documents({"status": "admitted"})
    appointments = await db["appointments"].count_documents({"status": "scheduled"})
    return {"patients": patients, "opd": opd, "ipd": ipd, "appointments": appointments}




async def bulk_import_patients(patients_data: list):
    db = get_db()
    imported_count = 0
    for data in patients_data:
        # Check if already exists by phone or email
        existing = await db["patients"].find_one({
            "$or": [
                {"phone": data.get("phone")},
                {"email": data.get("email")}
            ]
        })
        if existing:
            continue
            
        uhid = data.get("uhid") or await generate_uhid()
        doc = {
            "uhid": uhid,
            "name": data.get("name") or data.get("fullName"),
            "age": data.get("age"),
            "gender": data.get("gender"),
            "phone": data.get("phone"),
            "address": data.get("address"),
            "email": data.get("email"),
            "created_at": datetime.utcnow(),
            "import_tag": "csv-bulk"
        }
        await db["patients"].insert_one(doc)
        imported_count += 1
        
    return {"message": f"Successfully imported {imported_count} patients"}


async def create_notification(recipient_role: str, title: str, message: str, type: str = "info"):
    db = get_db()
    notif = {
        "recipient_role": recipient_role,
        "title": title,
        "message": message,
        "type": type,
        "is_read": False,
        "created_at": datetime.utcnow()
    }
    await db["notifications"].insert_one(notif)
    return notif


async def get_notifications(role: str):
    db = get_db()
    cursor = db["notifications"].find({"recipient_role": role}).sort("created_at", -1).limit(50)
    notifs = await cursor.to_list(length=50)
    for n in notifs:
        n["_id"] = str(n["_id"])
    return notifs


async def mark_notification_read(notif_id: str):
    db = get_db()
    await db["notifications"].update_one(
        {"_id": ObjectId(notif_id)},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notification marked as read"}
