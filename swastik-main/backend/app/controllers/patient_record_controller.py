from app.config.database import get_db
from app.controllers.registration_controller import get_patient_by_uhid
from bson import ObjectId
from datetime import datetime
from app.controllers import admin_controller

async def get_full_record(uhid: str):
    patient = await get_patient_by_uhid(uhid)
    if not patient:
        return None
    
    db = get_db()
    cursor = db["patient_documents"].find({"uhid": uhid}).sort("uploaded_at", -1)
    documents = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        documents.append(doc)
    
    return {
        "patient": patient,
        "documents": documents
    }

async def add_document(uhid: str, doc_data: dict):
    db = get_db()
    doc_data["uhid"] = uhid
    doc_data["uploaded_at"] = datetime.utcnow()
    
    result = await db["patient_documents"].insert_one(doc_data)
    doc_data["_id"] = str(result.inserted_id)

    # Log activity
    await admin_controller.log_activity("System/Doctor", "Patient Records", f"Added document '{doc_data['document_name']}' for UHID: {uhid}")

    return doc_data

async def delete_document(doc_id: str):
    db = get_db()
    result = await db["patient_documents"].delete_one({"_id": ObjectId(doc_id)})
    
    # Log activity
    await admin_controller.log_activity("System/Doctor", "Patient Records", f"Deleted document ID: {doc_id}")
    
    return result.deleted_count > 0
