"""Lab API: catalog, test requests (full flow), samples, results, reports, alerts, notifications."""
from fastapi import APIRouter, HTTPException, Query
from app.controllers import lab_controller
from app.schemas.lab import LabTestRequestCreate, LabResultsSubmit
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


# ---------- Catalog ----------
@router.get("/catalog")
async def get_catalog(category: Optional[str] = None):
    return await lab_controller.get_catalog(category)


@router.post("/catalog/seed")
async def seed_catalog():
    await lab_controller.seed_catalog_if_empty()
    return {"message": "Catalog seeded"}


@router.post("/seed-dummy")
async def seed_dummy():
    """Insert dummy lab requests, samples, results, reports and one critical alert for demo. Idempotent (skips if already present)."""
    await lab_controller.seed_dummy_lab_data()
    return {"message": "Dummy lab data seeded (or already present)"}


# ---------- New flow: test requests ----------
@router.post("/test-requests")
async def create_test_request(data: LabTestRequestCreate):
    return await lab_controller.create_test_request(
        data.patient_id,
        data.doctor_id,
        data.tests_ordered,
        data.clinical_notes or "",
        data.admission_id,
    )


@router.get("/test-requests")
async def list_test_requests(
    status: Optional[str] = None,
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    today_only: bool = False,
    skip: int = 0,
    limit: int = 100,
):
    return await lab_controller.get_requests(
        status=status,
        patient_id=patient_id,
        doctor_id=doctor_id,
        today_only=today_only,
        skip=skip,
        limit=limit,
    )


@router.get("/test-requests/{request_id}")
async def get_test_request(request_id: str):
    doc = await lab_controller.get_request_by_id(request_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    return doc


@router.post("/test-requests/{request_id}/refer-to-lab")
async def refer_patient_to_lab(request_id: str, referred_by: str = Query(..., description="Doctor name or id")):
    """Doctor: send patient to lab. Sets REFERRED_TO_LAB, assigns token, notifies lab."""
    ok, result = await lab_controller.refer_patient_to_lab(request_id, referred_by)
    if not ok:
        raise HTTPException(status_code=400, detail=result or "Failed")
    return {"message": "Patient referred to lab", "request_id": request_id, "lab_token_number": result}


@router.post("/test-requests/{request_id}/check-in")
async def check_in_patient(request_id: str, checked_in_by: str = Query(...)):
    """Lab reception: patient arrived at lab. Sets PATIENT_ARRIVED_AT_LAB, logs arrival and wait time."""
    ok, result = await lab_controller.check_in_patient_at_lab(request_id, checked_in_by)
    if not ok:
        raise HTTPException(status_code=400, detail=result or "Failed")
    return {"message": "Patient checked in", "request_id": request_id, "wait_time_minutes": result}


@router.get("/waiting-patients")
async def get_waiting_patients(today_only: bool = True):
    """List patients in REFERRED_TO_LAB or PATIENT_ARRIVED_AT_LAB (token-based queue)."""
    return await lab_controller.get_waiting_patients(today_only)


@router.get("/token-display")
async def get_token_display(today_only: bool = True):
    """Now serving / Next token for display board."""
    return await lab_controller.get_token_display(today_only)


@router.get("/average-wait-time")
async def get_average_wait_time():
    """Average patient wait time (minutes) today from arrival at lab."""
    return {"average_wait_time_minutes": await lab_controller.get_average_wait_time_today()}


@router.post("/test-requests/{request_id}/mark-no-show")
async def mark_no_show(request_id: str, marked_by: str = Query(...)):
    """Mark REFERRED_TO_LAB as no-show and notify doctor."""
    ok, err = await lab_controller.mark_no_show(request_id, marked_by)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Failed")
    return {"message": "Marked as no-show", "request_id": request_id}


@router.post("/process-no-shows")
async def process_no_shows(hours: float = Query(None, description="Hours after referral to mark no-show (default from config)")):
    """Background: mark REFERRED_TO_LAB older than X hours as no-show. Returns count."""
    count = await lab_controller.process_no_shows(hours)
    return {"message": "No-shows processed", "marked_count": count}


@router.post("/test-requests/{request_id}/acknowledge")
async def acknowledge_request(request_id: str, acknowledged_by: str = Query(..., description="Lab assistant user id or name")):
    ok, err = await lab_controller.acknowledge_request(request_id, acknowledged_by)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Failed")
    return {"message": "Acknowledged", "request_id": request_id}


@router.post("/test-requests/{request_id}/sample/start")
async def start_sample_collection(request_id: str, started_by: str = Query(...)):
    ok, err = await lab_controller.start_sample_collection(request_id, started_by)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Failed")
    return {"message": "Sample collection started", "request_id": request_id}


class SampleCompleteBody(BaseModel):
    sample_type: str = "blood"
    sample_condition: str = "good"
    collected_by: str


@router.post("/test-requests/{request_id}/sample/complete")
async def complete_sample_collection(request_id: str, data: SampleCompleteBody):
    ok, sample_id = await lab_controller.complete_sample_collection(
        request_id, data.sample_type, data.sample_condition, data.collected_by
    )
    if not ok:
        raise HTTPException(status_code=400, detail=sample_id or "Failed")
    return {"message": "Sample collected", "request_id": request_id, "sample_id": sample_id}


@router.post("/test-requests/{request_id}/test-in-process")
async def mark_test_in_process(request_id: str, updated_by: str = Query(...)):
    ok = await lab_controller.mark_test_in_process(request_id, updated_by)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid status")
    return {"message": "Test in process", "request_id": request_id}


@router.get("/test-requests/{request_id}/results")
async def get_request_results(request_id: str):
    return await lab_controller.get_results(request_id)


@router.post("/test-requests/{request_id}/results")
async def submit_results(request_id: str, data: LabResultsSubmit):
    results = [r.model_dump() if hasattr(r, "model_dump") else r for r in data.results]
    ok, alerts = await lab_controller.enter_results(request_id, results, data.entered_by)
    if not ok:
        raise HTTPException(status_code=400, detail=alerts or "Failed")
    return {"message": "Results saved", "request_id": request_id, "critical_alerts": alerts or []}


@router.post("/test-requests/{request_id}/report-generate")
async def generate_report(request_id: str, generated_by: str = Query(...)):
    ok, report_url = await lab_controller.generate_report_and_bill(request_id, generated_by)
    if not ok:
        raise HTTPException(status_code=400, detail=report_url or "Failed")
    return {"message": "Report ready", "request_id": request_id, "report_url": report_url}


@router.post("/test-requests/{request_id}/send-to-patient")
async def send_to_patient(request_id: str, sent_by: str = Query(..., description="Lab assistant name or id")):
    """Lab assistant explicitly sends the report to the patient so they can see it in the patient portal."""
    ok, err = await lab_controller.send_report_to_patient(request_id, sent_by)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Failed")
    return {"message": "Report sent to patient", "request_id": request_id}


@router.post("/test-requests/{request_id}/send-to-doctor")
async def send_to_doctor(request_id: str, sent_by: str = Query(..., description="Lab assistant name or id")):
    """Lab assistant explicitly sends the report to the referring doctor so they can view it in Lab Orders."""
    ok, err = await lab_controller.send_report_to_doctor(request_id, sent_by)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Failed")
    return {"message": "Report sent to doctor", "request_id": request_id}


@router.get("/test-requests/{request_id}/report")
async def get_report_data(request_id: str):
    """Return request + results for display/print as report."""
    req = await lab_controller.get_request_by_id(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    results = await lab_controller.get_results(request_id)
    return {"request": req, "results": results}


# ---------- Alerts & notifications ----------
@router.get("/alerts/critical")
async def get_critical_alerts(today_only: bool = True):
    return await lab_controller.get_critical_alerts(today_only)


@router.get("/notifications")
async def get_notifications(
    recipient_type: str = Query(..., description="doctor or patient"),
    recipient_id: str = Query(...),
    is_read: Optional[bool] = None,
):
    return await lab_controller.get_notifications_for_recipient(recipient_type, recipient_id, is_read)


# ---------- Stats (new) ----------
@router.get("/stats")
async def get_stats(today_only: bool = True):
    return await lab_controller.get_lab_stats(today_only)


# ---------- Legacy routes (lab_requests by orderId) ----------
class LabRequestCreate(BaseModel):
    uhid: str
    patientName: str
    tests: str
    source: Optional[str] = "OPD"
    priority: Optional[str] = "Normal"


class LabResult(BaseModel):
    id: int
    name: str
    unit: str
    normalRange: str
    value: str
    remarks: Optional[str] = ""
    flag: str


class LabResultsUpdate(BaseModel):
    results: List[LabResult]
    status: str


@router.post("/requests")
async def create_request_legacy(data: LabRequestCreate):
    return await lab_controller.create_lab_request(
        data.uhid, data.patientName, data.tests, data.source, data.priority
    )


@router.get("/requests")
async def get_requests_legacy(status: Optional[str] = None, skip: int = 0, limit: int = 100):
    return await lab_controller.get_lab_requests(status, skip, limit)


@router.get("/requests/{order_id}")
async def get_request_legacy(order_id: str):
    res = await lab_controller.get_lab_request_by_order_id(order_id)
    if not res:
        raise HTTPException(status_code=404, detail="Order not found")
    return res


class LegacyStatusUpdate(BaseModel):
    status: str
    sampleId: Optional[str] = None
    collectionTime: Optional[str] = None


@router.patch("/requests/{order_id}/status")
async def update_status_legacy(order_id: str, data: LegacyStatusUpdate):
    success = await lab_controller.update_lab_status(
        order_id, data.status, data.sampleId, data.collectionTime
    )
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated"}


@router.post("/requests/{order_id}/results")
async def save_results_legacy(order_id: str, data: LabResultsUpdate):
    results_list = [res.model_dump() for res in data.results]
    success = await lab_controller.save_lab_results(order_id, results_list, data.status)
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Results saved"}
