from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DischargeCreate(BaseModel):
    admission_id: str
    discharge_date: datetime = Field(default_factory=datetime.utcnow)
    diagnosis: Optional[str] = None
    treatment_given: str
    doctor_notes: Optional[str] = None
    condition_at_discharge: str
    follow_up_instructions: Optional[str] = None

class DischargeResponse(DischargeCreate):
    id: str
    patient_name: str
    uhid: str
    admission_date: datetime
    final_bill_id: Optional[str] = None
    created_at: datetime
