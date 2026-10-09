from app.config.database import get_db
from app.schemas.discharge import DischargeCreate
from app.controllers import admission_controller, room_controller, billing_controller, admin_controller
from bson import ObjectId
from datetime import datetime
from fastapi import HTTPException

DISCHARGES_COLLECTION = "discharges"

async def discharge_patient(data: DischargeCreate):
    db = get_db()
    
    # 1. Verify Admission
    admission = await admission_controller.get_admission_by_id(data.admission_id)
    if not admission:
        raise HTTPException(status_code=404, detail="Admission record not found")
    if admission.get("status") != "admitted":
        raise HTTPException(status_code=400, detail="Patient is already discharged or not admitted")
        
    # 2. Prevent Discharge if there are pending Unpaid Bills for this patient
    # Fetch any bills for this patient (or specifically this admission) that have a due_amount > 0
    pending_bills_cursor = db["bills"].find({
        "uhid": admission.get("uhid"),
        "due_amount": {"$gt": 0}
    })
    
    pending_bills = await pending_bills_cursor.to_list(length=10)
    if pending_bills:
        total_due = sum(bill.get("due_amount", 0) for bill in pending_bills)
        if total_due > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Discharge blocked. Patient has outstanding dues of ₹{total_due}. Please settle bills first."
            )
    
    # 3. Get Room Info for final processing
    room = await room_controller.get_room_by_id(admission.get("room_id"))
    if not room:
        raise HTTPException(status_code=404, detail="Original room record not found")
        
    # 4. Calculate Stay
    admission_date = admission.get("admission_date")
    if isinstance(admission_date, str):
        admission_date = datetime.fromisoformat(admission_date.replace("Z", "+00:00"))
        
    discharge_date = data.discharge_date or datetime.utcnow()
    if isinstance(discharge_date, str):
        discharge_date = datetime.fromisoformat(discharge_date.replace("Z", "+00:00"))

    if admission_date.tzinfo:
        admission_date = admission_date.replace(tzinfo=None)
    if discharge_date.tzinfo:
        discharge_date = discharge_date.replace(tzinfo=None)

    stay_delta = discharge_date - admission_date
    days = max(1, stay_delta.days)
    
    # 5. Create Discharge Record
    doc = data.dict()
    doc["patient_name"] = admission.get("patient_name")
    doc["uhid"] = admission.get("uhid")
    doc["admission_date"] = admission.get("admission_date")
    doc["stay_days"] = days
    doc["created_at"] = datetime.utcnow()
    
    result = await db[DISCHARGES_COLLECTION].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    
    # 6. Update Admission Status
    await db["admissions"].update_one(
        {"_id": ObjectId(data.admission_id)},
        {"$set": {"status": "discharged", "discharge_date": discharge_date}}
    )
    
    # 7. Free Room Immediately
    if admission.get("room_id"):
        await room_controller.update_room_status(admission.get("room_id"), "Available")
    
    # 8. Log Activity
    await admin_controller.log_activity("System/Discharge", "IPD", f"Successfully Discharged patient {admission.get('patient_name')} (UHID: {admission.get('uhid')}). Room Freed.")
    
    return doc

