from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class DoctorProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    department: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class CustomChecklistQuestion(BaseModel):
    id: str
    text: str
    isCustom: bool = True

class CustomQuestionsUpdate(BaseModel):
    questions: List[CustomChecklistQuestion]
