from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from app.schemas.admission import AdmissionCreate, AdmissionUpdate
from app.controllers import admission_controller
from typing import List
import os, shutil, uuid
from datetime import datetime

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "consent")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(tags=["Admissions"])

@router.post("")
async def admit_patient(data: AdmissionCreate):
    return await admission_controller.admit_patient(data)

@router.get("")
async def list_admissions(doctor_id: str = Query(None)):
    if doctor_id:
        return await admission_controller.list_admissions_by_doctor(doctor_id)
    return await admission_controller.list_active_admissions()

@router.get("/{admission_id}")
async def get_admission(admission_id: str):
    doc = await admission_controller.get_admission_by_id(admission_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Admission not found")
    return doc

@router.put("/{admission_id}")
async def update_admission(admission_id: str, data: AdmissionUpdate):
    return await admission_controller.update_admission(admission_id, data)


@router.post("/{uhid}/consent-upload")
async def upload_consent(
    uhid: str,
    file: UploadFile = File(...),
):
    """Upload a scanned signed consent form (JPG/PNG/PDF). Saved to disk and URL stored on the admission record."""
    allowed = {"image/jpeg", "image/png", "application/pdf"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, or PDF files are accepted.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    safe_name = f"{uhid}_{uuid.uuid4().hex[:8]}.{ext}"
    dest = os.path.join(UPLOAD_DIR, safe_name)

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Store reference on the admission record (latest active admission for this UHID)
    file_url = f"/api/admissions/consent-file/{safe_name}"
    result = await admission_controller.save_consent_file_url(uhid, file_url)
    return {"consent_file_url": file_url, "admission_id": result.get("admission_id")}


@router.get("/consent-file/{filename}")
async def serve_consent_file(filename: str):
    """Serve a stored consent file by filename."""
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


@router.get("/{uhid}/consent")
async def get_consent_info(uhid: str):
    """Return the consent file URL for the patient's latest active admission."""
    return await admission_controller.get_consent_info(uhid)
