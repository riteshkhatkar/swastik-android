from fastapi import APIRouter, HTTPException, Depends
from app.schemas.token import TokenCreate, TokenUpdate
from app.controllers import token_controller
from typing import List

router = APIRouter(prefix="/api/tokens", tags=["Tokens"])

@router.post("/generate")
async def generate_token(data: TokenCreate):
    return await token_controller.generate_token(
        data.patient_id, 
        data.doctor_id, 
        data.appointment_id
    )

@router.get("/doctor/{doctor_id}")
async def get_doctor_queue(doctor_id: str):
    return await token_controller.get_doctor_queue(doctor_id)

@router.put("/update/{token_id}")
async def update_token_status(token_id: str, data: TokenUpdate):
    return await token_controller.update_token_status(token_id, data.status)

@router.get("/today")
async def get_all_tokens_today():
    return await token_controller.get_all_tokens_today()
