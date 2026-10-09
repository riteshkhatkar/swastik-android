"""EMR schemas for Psychiatric Clinical Module. All include CreatedBy, UpdatedBy, Timestamp, version where applicable."""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


# ─── Admission & Care Team ─────────────────────────────────────────────────
class CareTeamMember(BaseModel):
    role: str  # primary, consultant, resident
    user_id: Optional[str] = None
    name: Optional[str] = None


class AdmissionCreate(BaseModel):
    uhid: str
    ward: Optional[str] = None
    bed: Optional[str] = None
    admission_reason: Optional[str] = None
    clinical_status: Optional[str] = "Under Observation"  # Stable, Critical, Under Observation
    care_team: Optional[list[CareTeamMember]] = None


class AdmissionUpdate(BaseModel):
    ward: Optional[str] = None
    bed: Optional[str] = None
    clinical_status: Optional[str] = None
    care_team: Optional[list[CareTeamMember]] = None


# ─── Symptoms & HPI ─────────────────────────────────────────────────────────
class SymptomsHPICreate(BaseModel):
    admission_id: str
    chief_complaint: Optional[str] = None
    onset: Optional[str] = None
    duration: Optional[str] = None
    precipitating_factors: Optional[str] = None
    perpetuating_factors: Optional[str] = None
    hpi: Optional[str] = None
    suicidal_ideation: Optional[str] = None  # none, passive, active, intent, plan
    self_harm_history: Optional[str] = None
    harm_to_others_risk: Optional[str] = None
    summary: Optional[str] = None
    created_by: Optional[str] = None


# ─── MSE ────────────────────────────────────────────────────────────────────
class MSECreate(BaseModel):
    admission_id: str
    session_date: Optional[datetime] = None
    appearance: Optional[list[str]] = None
    psychomotor: Optional[list[str]] = None
    speech: Optional[list[str]] = None
    mood: Optional[list[str]] = None
    affect: Optional[list[str]] = None
    thought_process: Optional[list[str]] = None
    thought_content: Optional[list[str]] = None
    perception: Optional[list[str]] = None
    cognition: Optional[list[str]] = None
    insight: Optional[list[str]] = None
    judgment: Optional[list[str]] = None
    attention: Optional[list[str]] = None
    free_text_overrides: Optional[dict[str, str]] = None
    summary: Optional[str] = None
    dangerous_flags: Optional[list[str]] = None  # SI, HI, command AH etc
    created_by: Optional[str] = None


# ─── Diagnosis ──────────────────────────────────────────────────────────────
class DiagnosisItem(BaseModel):
    code: str
    title: str
    system: Optional[str] = None  # icd10, icd11, dsm5
    severity: Optional[str] = None
    specifiers: Optional[list[str]] = None
    primary: bool = False


class DiagnosisCreate(BaseModel):
    admission_id: str
    primary_diagnosis: Optional[DiagnosisItem] = None
    differential: Optional[list[DiagnosisItem]] = None
    formulation_bio_psycho_social: Optional[str] = None
    created_by: Optional[str] = None


# ─── Risk Assessment ───────────────────────────────────────────────────────
class RiskAssessmentCreate(BaseModel):
    admission_id: str
    suicide_risk: Optional[str] = None  # Low, Moderate, High, Imminent
    violence_risk: Optional[str] = None
    elopement_risk: Optional[str] = None
    self_harm_risk: Optional[str] = None
    auto_calculated: Optional[dict[str, Any]] = None
    manual_override: Optional[bool] = False
    safety_plan_required: Optional[bool] = None
    safety_plan_done: Optional[bool] = None
    created_by: Optional[str] = None


# ─── Medication ─────────────────────────────────────────────────────────────
class MedicationCreate(BaseModel):
    admission_id: str
    drug_name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = "PO"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    prescribing_doctor_id: Optional[str] = None
    prescribing_doctor_name: Optional[str] = None
    status: Optional[str] = "Active"  # Active, Pending, Stopped
    prn: bool = False
    allergy_flag: bool = False
    interaction_alert: Optional[str] = None
    lab_monitoring_reminder: Optional[str] = None
    eps_warning: bool = False
    created_by: Optional[str] = None


class MedicationUpdate(BaseModel):
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    updated_by: Optional[str] = None


# ─── Lab & Monitoring ──────────────────────────────────────────────────────
class LabMonitoringCreate(BaseModel):
    admission_id: str
    uhid: str
    test_type: Optional[str] = None  # serum_level, thyroid, renal, etc
    test_name: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    abnormal: bool = False
    due_date: Optional[datetime] = None
    result_date: Optional[datetime] = None
    created_by: Optional[str] = None


# ─── Treatment Plan ────────────────────────────────────────────────────────
class TreatmentPlanCreate(BaseModel):
    admission_id: str
    short_term_goals: Optional[list[str]] = None
    long_term_goals: Optional[list[str]] = None
    therapy_modalities: Optional[list[str]] = None
    allied_referrals: Optional[list[str]] = None
    session_frequency: Optional[str] = None
    assigned_therapist_id: Optional[str] = None
    assigned_therapist_name: Optional[str] = None
    observation_level: Optional[str] = None
    discharge_criteria: Optional[list[str]] = None
    discharge_planning: Optional[str] = None
    safety_plan: Optional[str] = None
    emergency_contacts: Optional[list[dict[str, Any]]] = None
    created_by: Optional[str] = None


# ─── Session Notes (SOAP) ───────────────────────────────────────────────────
class SessionNoteCreate(BaseModel):
    admission_id: str
    session_type: Optional[str] = None  # OPD, IPD, Follow-up, etc
    session_date: Optional[datetime] = None
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    role_tag: Optional[str] = "Psychiatrist"  # Psychiatrist, Consultant, Nurse
    draft: bool = True
    signed: bool = False
    signed_at: Optional[datetime] = None
    signed_by: Optional[str] = None
    created_by: Optional[str] = None


# ─── Vitals ────────────────────────────────────────────────────────────────
class VitalsCreate(BaseModel):
    admission_id: Optional[str] = None
    uhid: str
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    hr: Optional[int] = None
    temp: Optional[float] = None
    spo2: Optional[int] = None
    weight: Optional[float] = None
    sleep_hours: Optional[float] = None
    appetite: Optional[str] = None
    agitation_score: Optional[int] = None  # 0-5
    recorded_by: Optional[str] = None


# ─── History Events (Timeline) ──────────────────────────────────────────────
class HistoryEventCreate(BaseModel):
    uhid: str
    event_type: str  # past_admission, past_diagnosis, medication_reaction, suicide_attempt, substance, eps, major_event
    date: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    created_by: Optional[str] = None


# ─── Audit ──────────────────────────────────────────────────────────────────
class AuditLogEntry(BaseModel):
    entity_type: str
    entity_id: str
    action: str  # create, update, delete, view
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    role: Optional[str] = None
    changes: Optional[dict[str, Any]] = None
    timestamp: Optional[datetime] = None


# ─── Structured Prescriptions ───────────────────────────────────────────────
class PrescriptionItem(BaseModel):
    drug_name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = "PO"
    duration: Optional[str] = None
    instructions: Optional[str] = None


class PrescriptionCreate(BaseModel):
    uhid: str
    patient_name: Optional[str] = None
    admission_id: Optional[str] = None
    medications: list[PrescriptionItem]
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
