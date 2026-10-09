"""EMR API routes: admissions, HPI, MSE, diagnosis, risk, medications, lab, treatment plan, session notes, vitals, history, audit."""
from fastapi import APIRouter, HTTPException, Body, Query
from app.controllers import emr_controller
from typing import Dict, Any, Optional

router = APIRouter(tags=["EMR"])


@router.get("/context/{uhid}")
async def get_emr_context(uhid: str):
    return await emr_controller.get_emr_context(uhid)


# Admissions
@router.post("/admissions/{uhid}")
async def create_admission(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    return await emr_controller.create_admission(uhid, data, created_by)


@router.get("/admissions/active/{uhid}")
async def get_active_admission(uhid: str):
    return await emr_controller.get_active_admission(uhid)


@router.get("/admissions/{admission_id}")
async def get_admission(admission_id: str):
    out = await emr_controller.get_admission_by_id(admission_id)
    if not out:
        raise HTTPException(404, "Admission not found")
    return out


@router.get("/admissions/list/{uhid}")
async def list_admissions(uhid: str):
    return await emr_controller.list_admissions(uhid)


@router.patch("/admissions/{admission_id}")
async def update_admission(admission_id: str, data: Dict[str, Any] = Body(...), updated_by: Optional[str] = Query(None)):
    return await emr_controller.update_admission(admission_id, data, updated_by)


# Symptoms & HPI
@router.post("/symptoms-hpi/{uhid}")
async def save_symptoms_hpi(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    if not aid:
        raise HTTPException(400, "admission_id required")
    return await emr_controller.save_symptoms_hpi(uhid, aid, data, created_by)


@router.get("/symptoms-hpi/{uhid}")
async def get_symptoms_hpi(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_symptoms_hpi(uhid, admission_id)


@router.get("/symptoms-hpi/{uhid}/history")
async def get_symptoms_hpi_history(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_symptoms_hpi_history(uhid, admission_id)


# MSE
@router.post("/mse/{uhid}")
async def save_mse(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    if not aid:
        raise HTTPException(400, "admission_id required")
    return await emr_controller.save_mse(uhid, aid, data, created_by)


@router.get("/mse/{uhid}")
async def get_mse(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_mse_latest(uhid, admission_id)


@router.get("/mse/{uhid}/history")
async def get_mse_history(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_mse_history(uhid, admission_id)


# Diagnosis
@router.post("/diagnosis/{uhid}")
async def save_diagnosis(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    if not aid:
        raise HTTPException(400, "admission_id required")
    return await emr_controller.save_diagnosis(uhid, aid, data, created_by)


@router.get("/diagnosis/{uhid}")
async def get_diagnosis(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_diagnosis_latest(uhid, admission_id)


@router.get("/diagnosis/{uhid}/history")
async def get_diagnosis_history(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_diagnosis_history(uhid, admission_id)


# Risk Assessment
@router.post("/risk/{uhid}")
async def save_risk(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    if not aid:
        raise HTTPException(400, "admission_id required")
    return await emr_controller.save_risk_assessment(uhid, aid, data, created_by)


@router.get("/risk/{uhid}")
async def get_risk(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_risk_latest(uhid, admission_id)


@router.get("/risk/{uhid}/history")
async def get_risk_history(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_risk_history(uhid, admission_id)


# Medications
@router.post("/medications/{uhid}")
async def add_medication(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    if not aid:
        raise HTTPException(400, "admission_id required")
    return await emr_controller.add_medication(uhid, aid, data, created_by)


@router.get("/medications/{uhid}")
async def list_medications(uhid: str, admission_id: Optional[str] = Query(None)):
    return await emr_controller.list_medications(uhid, admission_id)


@router.patch("/medications/{medication_id}")
async def update_medication(medication_id: str, data: Dict[str, Any] = Body(...), updated_by: Optional[str] = Query(None)):
    return await emr_controller.update_medication(medication_id, data, updated_by)


# Lab Monitoring
@router.post("/lab-monitoring/{uhid}")
async def add_lab(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    if not aid:
        raise HTTPException(400, "admission_id required")
    return await emr_controller.add_lab_monitoring(uhid, aid, data, created_by)


@router.get("/lab-monitoring/{uhid}")
async def list_lab(uhid: str, admission_id: Optional[str] = Query(None)):
    return await emr_controller.list_lab_monitoring(uhid, admission_id)


# Treatment Plan
@router.post("/treatment-plan/{uhid}")
async def save_treatment_plan(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    if not aid:
        raise HTTPException(400, "admission_id required")
    return await emr_controller.save_treatment_plan(uhid, aid, data, created_by)


@router.get("/treatment-plan/{uhid}")
async def get_treatment_plan(uhid: str, admission_id: str = Query(...)):
    return await emr_controller.get_treatment_plan_latest(uhid, admission_id)


# Session Notes
@router.post("/session-notes/{uhid}")
async def create_session_note(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    if not aid:
        raise HTTPException(400, "admission_id required")
    return await emr_controller.create_session_note(uhid, aid, data, created_by)


@router.patch("/session-notes/{note_id}")
async def update_session_note(note_id: str, data: Dict[str, Any] = Body(...), updated_by: Optional[str] = Query(None)):
    out = await emr_controller.update_session_note(note_id, data, updated_by)
    if out and isinstance(out, dict) and out.get("error"):
        raise HTTPException(400, out["error"])
    return out


@router.get("/session-notes/{uhid}")
async def list_session_notes(uhid: str, admission_id: Optional[str] = Query(None)):
    return await emr_controller.list_session_notes(uhid, admission_id)


# Vitals
@router.post("/vitals/{uhid}")
async def add_vitals(uhid: str, data: Dict[str, Any] = Body(...), recorded_by: Optional[str] = Query(None)):
    aid = data.get("admission_id")
    return await emr_controller.add_vitals(uhid, aid, data, recorded_by)


@router.get("/vitals/{uhid}")
async def list_vitals(uhid: str, admission_id: Optional[str] = Query(None), limit: int = Query(100, le=500)):
    return await emr_controller.list_vitals(uhid, admission_id, limit)


# History Events
@router.post("/history/{uhid}")
async def add_history_event(uhid: str, data: Dict[str, Any] = Body(...), created_by: Optional[str] = Query(None)):
    return await emr_controller.add_history_event(uhid, data, created_by)


@router.get("/history/{uhid}")
async def list_history(uhid: str, event_type: Optional[str] = Query(None), year: Optional[int] = Query(None)):
    return await emr_controller.list_history_events(uhid, event_type, year)


# Audit
@router.get("/audit")
async def get_audit(entity_type: Optional[str] = Query(None), entity_id: Optional[str] = Query(None), limit: int = Query(100, le=500)):
    return await emr_controller.get_audit_log(entity_type, entity_id, limit)


@router.get("/ward-summary/{uhid}")
async def get_ward_summary(uhid: str, admission_id: Optional[str] = Query(None)):
    return await emr_controller.get_ward_summary(uhid, admission_id)


@router.get("/timeline/{uhid}")
async def get_clinical_timeline(uhid: str, admission_id: Optional[str] = Query(None)):
    return await emr_controller.get_clinical_timeline(uhid, admission_id)
