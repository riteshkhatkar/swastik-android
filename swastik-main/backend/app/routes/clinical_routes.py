from fastapi import APIRouter, HTTPException, Body
from app.controllers import clinical_controller
from app.schemas.emr import PrescriptionCreate
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

router = APIRouter()

@router.post("/consultation/{uhid}")
async def save_consultation(uhid: str, data: Dict[str, Any] = Body(...)):
    return await clinical_controller.save_consultation(uhid, data)

@router.post("/prescription/{uhid}")
async def save_prescription(uhid: str, data: PrescriptionCreate):
    return await clinical_controller.save_prescription(uhid, data.dict())

@router.get("/prescription")
async def get_prescriptions(uhid: Optional[str] = None, doctor_id: Optional[str] = None, search: Optional[str] = None):
    return await clinical_controller.get_prescriptions(uhid=uhid, doctor_id=doctor_id, search=search)

@router.get("/prescription/{uhid}")
async def get_patient_prescriptions(uhid: str):
    return await clinical_controller.get_prescriptions(uhid=uhid)

@router.post("/ipd/admission/{uhid}")
async def save_ipd_admission(uhid: str, data: Dict[str, Any] = Body(...)):
    return await clinical_controller.save_ipd_admission_details(uhid, data)

@router.post("/ipd/progress/{uhid}")
async def save_ipd_progress(uhid: str, data: Dict[str, Any] = Body(...)):
    return await clinical_controller.save_ipd_progress_note(uhid, data)

@router.patch("/ipd/action/{uhid}")
async def update_ipd_action(uhid: str, action: str, details: Dict[str, Any] = Body(...)):
    res = await clinical_controller.update_ipd_status(uhid, action, details)
    if not res:
        raise HTTPException(status_code=404, detail="Active IPD record not found")
    return res

@router.post("/rehab/{uhid}")
async def save_rehab_data(uhid: str, rehab_type: str, data: Dict[str, Any] = Body(...)):
    return await clinical_controller.save_rehab_data(uhid, rehab_type, data)
@router.get("/history/{uhid}")
async def get_clinical_history(uhid: str):
    return await clinical_controller.get_clinical_history(uhid)

@router.post("/daily-routine/{uhid}")
async def save_daily_routine(uhid: str, data: Dict[str, Any] = Body(...)):
    return await clinical_controller.save_daily_routine(uhid, data)
