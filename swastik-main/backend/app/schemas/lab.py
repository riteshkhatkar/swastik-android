"""Lab module: catalog, test requests, samples, results, reports, notifications."""
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

LAB_STATUS_FLOW = [
    "REQUESTED",
    "ACKNOWLEDGED",
    "REFERRED_TO_LAB",
    "PATIENT_ARRIVED_AT_LAB",
    "SAMPLE_COLLECTION_IN_PROCESS",
    "SAMPLE_COLLECTED",
    "SAMPLE_RECEIVED_IN_LAB",
    "TEST_IN_PROCESS",
    "RESULTS_ENTERED",
    "RESULTS_VERIFIED",
    "REPORT_READY",
    "REPORT_RELEASED",
]
# Physical visit flow: REQUESTED -> REFERRED_TO_LAB -> PATIENT_ARRIVED_AT_LAB -> SAMPLE_COLLECTION_IN_PROCESS -> SAMPLE_COLLECTED -> SAMPLE_RECEIVED_IN_LAB -> ...
NO_SHOW_HOURS_DEFAULT = 4  # configurable: mark REFERRED_TO_LAB as no-show after N hours


# --- Catalog (admin/seed) ---
class LabTestCatalogItem(BaseModel):
    test_name: str
    category: str  # Blood Tests, Urine, Toxicology, Medication Level, Hormonal, Neurological
    sample_type: str  # blood, urine, csf, swab
    unit: str = ""
    reference_range_min: Optional[float] = None
    reference_range_max: Optional[float] = None
    reference_range_text: Optional[str] = None  # e.g. "Negative/Positive"
    critical_min: Optional[float] = None
    critical_max: Optional[float] = None
    price: float = 0
    turnaround_time_hours: int = 24


# --- Request (doctor orders) ---
class LabTestRequestCreate(BaseModel):
    patient_id: str  # uhid or patient _id
    doctor_id: Optional[str] = ""  # optional; backend resolves from doctors collection if missing
    tests_ordered: List[str]  # list of catalog test ids or test_name keys
    clinical_notes: Optional[str] = ""
    admission_id: Optional[str] = None


# --- Status update (lab assistant) ---
class LabStatusUpdate(BaseModel):
    status: str
    sample_id: Optional[str] = None
    collection_time: Optional[str] = None
    sample_type: Optional[str] = None
    sample_condition: Optional[str] = "good"  # good, hemolyzed, rejected
    collected_by: Optional[str] = None


# --- Result entry ---
class LabResultEntry(BaseModel):
    test_catalog_id: str
    value: Optional[float] = None
    value_text: Optional[str] = None  # for Positive/Negative etc.
    unit: str = ""
    reference_range: Optional[str] = None
    is_abnormal: bool = False
    is_critical: bool = False
    file_attachment_url: Optional[str] = None


class LabResultsSubmit(BaseModel):
    results: List[LabResultEntry]
    entered_by: str
    status: str = "RESULTS_ENTERED"


# --- Notifications ---
class LabNotificationCreate(BaseModel):
    request_id: str
    recipient_type: str  # doctor, patient
    recipient_id: str
    message: str
    is_critical: bool = False
