from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class PatientRegistrationCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    password: Optional[str] = None
    
    # Guardian Info
    guardian_name: Optional[str] = None
    guardian_relation: Optional[str] = None
    guardian_contact: Optional[str] = None
    guardian_address: Optional[str] = None
    guardian_id_type: Optional[str] = None
    guardian_id_number: Optional[str] = None
    guardian_consent: Optional[bool] = False
    
    # Emergency Contact
    emergency_name: Optional[str] = None
    emergency_relation: Optional[str] = None
    emergency_contact: Optional[str] = None
    
    # Medical/Psychiatric History
    prev_psychiatric: Optional[str] = None
    on_medication: Optional[str] = None
    medication_details: Optional[str] = None
    substance_history: Optional[str] = None
    self_harm_history: Optional[str] = None
    violent_history: Optional[str] = None
    
    # Visit & Insurance
    visit_type: Optional[str] = None
    insurance_provider: Optional[str] = None
    policy_number: Optional[str] = None
    valid_till: Optional[str] = None
    self_pay: Optional[bool] = False
    
    photo_base64: Optional[str] = None


class PatientRegistrationResponse(BaseModel):
    id: str
    uhid: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    photo_base64: Optional[str] = None
    dob: Optional[str] = None  # Added dob field
    created_at: Optional[datetime] = None


class OPDRegistrationCreate(BaseModel):
    uhid: str
    patient_name: Optional[str] = None
    department: Optional[str] = None
    doctor_id: Optional[str] = None
    visit_type: Optional[str] = "OPD"
    notes: Optional[str] = None


class IPDRegistrationCreate(BaseModel):
    uhid: str
    patient_name: Optional[str] = None
    ward: Optional[str] = None
    bed_id: Optional[str] = None
    bed_number: Optional[str] = None
    admission_reason: Optional[str] = None
    admitted_by: Optional[str] = None
    deposit: Optional[float] = 0.0
    notes: Optional[str] = None


class DoctorRegistrationCreate(BaseModel):
    name: str
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None


class StaffRegistrationCreate(BaseModel):
    name: str
    role: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class AppointmentCreate(BaseModel):
    uhid: str
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None  # optional; used for SMS if patient record has no phone
    doctor_id: Optional[str] = None
    appointment_date: str
    appointment_time: Optional[str] = None
    type: Optional[str] = None  # therapy, opd, etc.
    notes: Optional[str] = None
