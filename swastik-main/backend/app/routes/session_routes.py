from fastapi import APIRouter, Depends, Query
from app.controllers import session_controller
from app.middleware.auth import get_current_user

router = APIRouter(tags=["session"])

@router.post("/start")
async def start_session(patient_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    return await session_controller.start_session(
        patient_id=patient_id, 
        doctor_id=current_user["id"], 
        doctor_name=current_user.get("full_name", current_user["sub"])
    )

@router.post("/end")
async def end_session(patient_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    return await session_controller.end_session(patient_id=patient_id, doctor_id=current_user["id"])

@router.get("/status/{patient_id}")
async def get_session_status(patient_id: str):
    return await session_controller.get_session_status(patient_id)

@router.get("/active")
async def list_active_sessions():
    return await session_controller.list_active_sessions()
