from fastapi import APIRouter, HTTPException
from app.controllers import patient_record_controller
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(tags=["patient-records"])

class DocumentCreate(BaseModel):
    document_name: str
    category: str
    risk_level: str
    uploaded_by: str
    therapist: str
    confidential: bool
    notes: Optional[str] = None
    file_type: str
    file_name: str
    file_data: Optional[str] = None # Base64 or URL

@router.get("/{uhid}")
async def get_patient_record(uhid: str):
    record = await patient_record_controller.get_full_record(uhid)
    if not record:
        raise HTTPException(status_code=404, detail="Patient not found")
    return record

@router.post("/{uhid}/documents")
async def add_document(uhid: str, doc: DocumentCreate):
    return await patient_record_controller.add_document(uhid, doc.dict())

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    success = await patient_record_controller.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}
