from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TokenCreate(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_id: Optional[str] = None

class TokenUpdate(BaseModel):
    status: str

class TokenResponse(BaseModel):
    id: str
    token_number: str
    patient_id: str
    doctor_id: str
    appointment_id: Optional[str] = None
    status: str
    created_at: datetime
