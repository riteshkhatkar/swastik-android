from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AdmissionCreate(BaseModel):
    uhid: str
    patient_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    admission_date: datetime = Field(default_factory=datetime.utcnow)
    diagnosis: str
    doctor_id: str
    doctor_name: Optional[str] = None
    room_id: str
    room_number: Optional[str] = None
    insurance_provider: Optional[str] = None
    policy_number: Optional[str] = None
    consent_signed: bool = False
    deposit: float = 0.0
    notes: Optional[str] = None

class AdmissionUpdate(BaseModel):
    diagnosis: Optional[str] = None
    doctor_id: Optional[str] = None
    room_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None # admitted, discharged
    clinical_status: Optional[str] = None # Under Observation, Stable, Critical, Ready for Discharge

class AdmissionResponse(AdmissionCreate):
    id: str
    status: str
    created_at: datetime
