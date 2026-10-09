from fastapi import APIRouter
from app.schemas.discharge import DischargeCreate
from app.controllers import discharge_controller

router = APIRouter(prefix="/api/discharges", tags=["Discharges"])

@router.post("")
async def discharge_patient(data: DischargeCreate):
    return await discharge_controller.discharge_patient(data)
