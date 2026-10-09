"""Lab module: catalog, requests, samples, results, reports, notifications, billing trigger, physical visit workflow."""
from app.config.database import get_db
from app.schemas.lab import LAB_STATUS_FLOW, NO_SHOW_HOURS_DEFAULT
from app.controllers import admin_controller
from bson import ObjectId
from datetime import datetime, timedelta
import uuid

COLL_CATALOG = "lab_tests_catalog"
COLL_REQUESTS = "lab_test_requests"
COLL_SAMPLES = "lab_samples"
COLL_RESULTS = "lab_results"
COLL_REPORTS = "lab_reports"
COLL_NOTIFICATIONS = "lab_notifications"
COLL_VISIT_LOGS = "lab_visit_logs"


def _oid(s: str):
    try:
        return ObjectId(s)
    except Exception:
        return None


def _serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id", ""))
    return doc


async def _next_request_id():
    db = get_db()
    today = datetime.utcnow().strftime("%Y%m%d")
    key = f"lab_request_{today}"
    doc = await db["counters"].find_one({"_id": key})
    if not doc:
        await db["counters"].insert_one({"_id": key, "seq": 1})
        seq = 1
    else:
        seq = doc.get("seq", 0) + 1
        await db["counters"].update_one({"_id": key}, {"$set": {"seq": seq}})
    return f"LAB-{today}-{seq:04d}"


async def _next_lab_token_number():
    """Auto-incremental lab visit token for the day (e.g. 1, 2, 3...)."""
    db = get_db()
    today = datetime.utcnow().strftime("%Y%m%d")
    key = f"lab_token_{today}"
    doc = await db["counters"].find_one({"_id": key})
    if not doc:
        await db["counters"].insert_one({"_id": key, "seq": 1})
        return 1
    seq = doc.get("seq", 0) + 1
    await db["counters"].update_one({"_id": key}, {"$set": {"seq": seq}})
    return seq


# ---------- Catalog ----------
async def get_catalog(category: str = None):
    db = get_db()
    q = {} if not category else {"category": category}
    cursor = db[COLL_CATALOG].find(q).sort("category", 1).sort("test_name", 1)
    out = []
    async for doc in cursor:
        out.append(_serialize_doc(doc))
    return out


async def seed_catalog_if_empty():
    db = get_db()
    n = await db[COLL_CATALOG].count_documents({})
    if n > 0:
        return
    seed = [
        {"test_name": "CBC", "category": "Blood Tests", "sample_type": "blood", "unit": "", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 300, "turnaround_time_hours": 24},
        {"test_name": "Blood Sugar (F/R/PP)", "category": "Blood Tests", "sample_type": "blood", "unit": "mg/dL", "reference_range_min": 70, "reference_range_max": 140, "reference_range_text": None, "critical_min": 40, "critical_max": 400, "price": 150, "turnaround_time_hours": 4},
        {"test_name": "Lipid Panel", "category": "Blood Tests", "sample_type": "blood", "unit": "mg/dL", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 400, "turnaround_time_hours": 24},
        {"test_name": "LFT", "category": "Blood Tests", "sample_type": "blood", "unit": "", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 500, "turnaround_time_hours": 24},
        {"test_name": "RFT", "category": "Blood Tests", "sample_type": "blood", "unit": "", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 400, "turnaround_time_hours": 24},
        {"test_name": "Lithium", "category": "Medication Level", "sample_type": "blood", "unit": "mEq/L", "reference_range_min": 0.6, "reference_range_max": 1.2, "reference_range_text": "0.6-1.2 therapeutic", "critical_min": 0.4, "critical_max": 1.5, "price": 600, "turnaround_time_hours": 24},
        {"test_name": "Clozapine Level", "category": "Medication Level", "sample_type": "blood", "unit": "ng/mL", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per protocol", "critical_min": None, "critical_max": None, "price": 800, "turnaround_time_hours": 48},
        {"test_name": "Valproate Level", "category": "Medication Level", "sample_type": "blood", "unit": "mcg/mL", "reference_range_min": 50, "reference_range_max": 125, "reference_range_text": None, "critical_min": None, "critical_max": None, "price": 700, "turnaround_time_hours": 24},
        {"test_name": "TSH", "category": "Hormonal", "sample_type": "blood", "unit": "mIU/L", "reference_range_min": 0.4, "reference_range_max": 4.0, "reference_range_text": None, "critical_min": 0.1, "critical_max": 10.0, "price": 350, "turnaround_time_hours": 24},
        {"test_name": "T3", "category": "Hormonal", "sample_type": "blood", "unit": "pg/mL", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 350, "turnaround_time_hours": 24},
        {"test_name": "T4", "category": "Hormonal", "sample_type": "blood", "unit": "ng/dL", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 350, "turnaround_time_hours": 24},
        {"test_name": "Prolactin", "category": "Hormonal", "sample_type": "blood", "unit": "ng/mL", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 400, "turnaround_time_hours": 24},
        {"test_name": "Cortisol", "category": "Hormonal", "sample_type": "blood", "unit": "mcg/dL", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 500, "turnaround_time_hours": 24},
        {"test_name": "Urine Drug Screen", "category": "Toxicology", "sample_type": "urine", "unit": "", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "Negative/Positive", "critical_min": None, "critical_max": None, "price": 600, "turnaround_time_hours": 24},
        {"test_name": "Alcohol Level", "category": "Toxicology", "sample_type": "blood", "unit": "mg/dL", "reference_range_min": 0, "reference_range_max": 0, "reference_range_text": None, "critical_min": None, "critical_max": 200, "price": 400, "turnaround_time_hours": 8},
        {"test_name": "Routine Urine Analysis", "category": "Urine", "sample_type": "urine", "unit": "", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 200, "turnaround_time_hours": 24},
        {"test_name": "CSF Analysis", "category": "Neurological", "sample_type": "csf", "unit": "", "reference_range_min": None, "reference_range_max": None, "reference_range_text": "As per standard", "critical_min": None, "critical_max": None, "price": 1200, "turnaround_time_hours": 48},
        {"test_name": "Vitamin B12", "category": "Blood Tests", "sample_type": "blood", "unit": "pg/mL", "reference_range_min": 200, "reference_range_max": 900, "reference_range_text": None, "critical_min": 150, "critical_max": None, "price": 450, "turnaround_time_hours": 48},
        {"test_name": "ANC (for Clozapine)", "category": "Blood Tests", "sample_type": "blood", "unit": "/mcL", "reference_range_min": 1500, "reference_range_max": None, "reference_range_text": ">1500 for Clozapine", "critical_min": 1000, "critical_max": None, "price": 250, "turnaround_time_hours": 24},
    ]
    for item in seed:
        item["_id"] = item.get("test_name", str(uuid.uuid4())[:12])
    try:
        await db[COLL_CATALOG].insert_many(seed, ordered=False)
    except Exception:
        pass
    await admin_controller.log_activity("System", "Lab", "Seeded lab_tests_catalog")


# ---------- Test requests ----------
async def create_test_request(patient_id: str, doctor_id: str, tests_ordered: list, clinical_notes: str = "", admission_id: str = None):
    db = get_db()
    request_id = await _next_request_id()
    patient = await db["patients"].find_one({"$or": [{"uhid": patient_id}, {"_id": _oid(patient_id)}]})
    doctor = await db["doctors"].find_one({"_id": _oid(doctor_id)}) if doctor_id and _oid(doctor_id) else await db["doctors"].find_one()
    if not doctor and doctor_id:
        doctor = await db["doctors"].find_one({"name": {"$regex": doctor_id, "$options": "i"}})
    patient_name = (patient or {}).get("name") or (patient or {}).get("patientName") or "Unknown"
    age = (patient or {}).get("age")
    sex = (patient or {}).get("sex") or (patient or {}).get("gender") or "—"
    ward_room = (patient or {}).get("ward") or (patient or {}).get("room") or ""
    doctor_name = (doctor or {}).get("name") or "Doctor"
    resolved_doctor_id = str(doctor["_id"]) if doctor else (doctor_id or "")
    uhid = (patient or {}).get("uhid") or patient_id

    doc = {
        "request_id": request_id,
        "patient_id": patient_id,
        "uhid": uhid,
        "patient_name": patient_name,
        "patient_age": age,
        "patient_sex": sex,
        "ward_room": ward_room,
        "doctor_id": resolved_doctor_id,
        "doctor_name": doctor_name,
        "tests_ordered": list(tests_ordered),
        "clinical_notes": clinical_notes or "",
        "admission_id": admission_id,
        "status": "REQUESTED",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by_doctor_id": resolved_doctor_id,
    }
    await db[COLL_REQUESTS].insert_one(doc)
    doc = _serialize_doc(await db[COLL_REQUESTS].find_one({"request_id": request_id}))
    await admin_controller.log_activity(doctor_name, "Lab", f"Ordered lab test {request_id} for {patient_name}")
    return doc


async def get_requests(status: str = None, skip: int = 0, limit: int = 100, request_id: str = None, patient_id: str = None, doctor_id: str = None, today_only: bool = False):
    db = get_db()
    q = {}
    if status:
        q["status"] = status
    if request_id:
        q["request_id"] = request_id
    if patient_id:
        # Support multiple identifiers (e.g. "UHID-001" or "UHID-001,email@x.com") for patient portal
        ids = [s.strip() for s in patient_id.split(",") if s.strip()]
        if len(ids) == 1:
            q["$or"] = [{"patient_id": ids[0]}, {"uhid": ids[0]}]
        elif len(ids) > 1:
            q["$or"] = [{"$or": [{"patient_id": p}, {"uhid": p}]} for p in ids]
    if doctor_id:
        # Support multiple doctor IDs (e.g. "id1,id2") for team-based dashboards
        doc_ids = [d.strip() for d in doctor_id.split(",") if d.strip()]
        if len(doc_ids) == 1:
            q["doctor_id"] = doc_ids[0]
        elif len(doc_ids) > 1:
            q["doctor_id"] = {"$in": doc_ids}
    if today_only:
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        q["created_at"] = {"$gte": start}
    cursor = db[COLL_REQUESTS].find(q).sort("created_at", -1).skip(skip).limit(limit)
    out = []
    async for doc in cursor:
        d = _serialize_doc(doc)
        out.append(d)
    return out


async def get_request_by_id(request_id: str):
    db = get_db()
    doc = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    return _serialize_doc(doc)


def _valid_status_transition(current: str, new: str) -> bool:
    try:
        i = LAB_STATUS_FLOW.index(current)
        j = LAB_STATUS_FLOW.index(new)
        return j >= i and (j == i + 1 or (current == "SAMPLE_COLLECTED" and new == "TEST_IN_PROCESS") or (current == "RESULTS_ENTERED" and new == "REPORT_READY"))
    except (ValueError, AttributeError):
        return False


async def acknowledge_request(request_id: str, acknowledged_by: str):
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req or req.get("status") != "REQUESTED":
        return False, "Invalid or already acknowledged"
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {"status": "ACKNOWLEDGED", "updated_at": datetime.utcnow(), "acknowledged_by": acknowledged_by}}
    )
    await _notify_patient(request_id, req.get("patient_id") or req.get("uhid"), req.get("patient_name"), req.get("tests_ordered"))
    await admin_controller.log_activity(acknowledged_by, "Lab", f"Acknowledged lab request {request_id}")
    return True, None


# ---------- Physical lab visit workflow ----------
async def refer_patient_to_lab(request_id: str, referred_by: str):
    """Doctor sends patient to lab: set REFERRED_TO_LAB, assign token, notify lab dashboard."""
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req:
        return False, "Request not found"
    status = req.get("status")
    if status not in ("REQUESTED", "ACKNOWLEDGED"):
        return False, f"Invalid status for referral: {status}"
    now = datetime.utcnow()
    token = await _next_lab_token_number()
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "REFERRED_TO_LAB",
            "lab_token_number": token,
            "referred_to_lab_at": now,
            "referred_by": referred_by,
            "updated_at": now,
        }}
    )
    await _notify_lab_referred(request_id, req.get("patient_name"), req.get("doctor_name"))
    await admin_controller.log_activity(referred_by, "Lab", f"Referred patient to lab {request_id} (Token #{token})")
    return True, token


async def _notify_lab_referred(request_id: str, patient_name: str, doctor_name: str):
    """Push to lab dashboard: patient referred by doctor."""
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    token = req.get("lab_token_number") if req else "—"
    await db[COLL_NOTIFICATIONS].insert_one({
        "request_id": request_id,
        "recipient_type": "lab",
        "recipient_id": "lab_dashboard",
        "message": f"Patient {patient_name or '—'} referred to Lab by Dr. {doctor_name or '—'} (Token #{token}).",
        "is_read": False,
        "is_critical": False,
        "created_at": datetime.utcnow(),
        "lab_token_number": token,
    })


async def check_in_patient_at_lab(request_id: str, checked_in_by: str):
    """Lab reception: patient arrived. Set PATIENT_ARRIVED_AT_LAB, log arrival, compute wait time."""
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req or req.get("status") != "REFERRED_TO_LAB":
        return False, "Invalid or wrong status (patient must be REFERRED_TO_LAB)"
    if req.get("no_show_flag"):
        return False, "Request marked as no-show"
    now = datetime.utcnow()
    referred_at = req.get("referred_to_lab_at") or req.get("created_at")
    if isinstance(referred_at, datetime):
        wait_minutes = max(0, int((now - referred_at).total_seconds() / 60))
    else:
        wait_minutes = 0
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "PATIENT_ARRIVED_AT_LAB",
            "patient_arrived_at": now,
            "checked_in_by": checked_in_by,
            "updated_at": now,
        }}
    )
    await db[COLL_VISIT_LOGS].insert_one({
        "request_id": request_id,
        "token_number": req.get("lab_token_number"),
        "arrival_time": now,
        "checked_in_by": checked_in_by,
        "wait_time_minutes": wait_minutes,
        "created_at": now,
    })
    await admin_controller.log_activity(checked_in_by, "Lab", f"Checked in patient at lab {request_id} (Token #{req.get('lab_token_number')})")
    return True, wait_minutes


async def _notify_patient(request_id: str, patient_id: str, patient_name: str, tests_ordered: list):
    db = get_db()
    tests_str = ", ".join(tests_ordered[:3]) + ("..." if len(tests_ordered) > 3 else "")
    await db[COLL_NOTIFICATIONS].insert_one({
        "request_id": request_id,
        "recipient_type": "patient",
        "recipient_id": patient_id,
        "message": f"Your lab test(s): {tests_str} have been requested. Please visit the lab to give your sample.",
        "is_read": False,
        "is_critical": False,
        "created_at": datetime.utcnow(),
    })


async def start_sample_collection(request_id: str, started_by: str):
    """Start sample collection. Allowed only when PATIENT_ARRIVED_AT_LAB (or ACKNOWLEDGED for legacy)."""
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    allowed = req and req.get("status") in ("PATIENT_ARRIVED_AT_LAB", "ACKNOWLEDGED")
    if not allowed:
        return False, "Patient must be checked in at lab first (PATIENT_ARRIVED_AT_LAB)"
    now = datetime.utcnow()
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "SAMPLE_COLLECTION_IN_PROCESS",
            "sample_collection_started_at": now,
            "updated_at": now,
            "sample_collection_started_by": started_by,
        }}
    )
    await admin_controller.log_activity(started_by, "Lab", f"Started sample collection for {request_id}")
    return True, None


async def complete_sample_collection(request_id: str, sample_type: str, sample_condition: str, collected_by: str):
    """Mark sample collected: generate barcode/sample_id, store details, then auto-advance to SAMPLE_RECEIVED_IN_LAB."""
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req or req.get("status") != "SAMPLE_COLLECTION_IN_PROCESS":
        return False, "Invalid or wrong status"
    sample_id = f"SMP-{uuid.uuid4().hex[:10].upper()}"
    now = datetime.utcnow()
    await db[COLL_SAMPLES].insert_one({
        "request_id": request_id,
        "sample_id": sample_id,
        "sample_type": sample_type or "blood",
        "collected_by": collected_by,
        "collection_start_time": req.get("sample_collection_started_at"),
        "collection_end_time": now,
        "sample_condition": sample_condition or "good",
        "created_at": now,
    })
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "SAMPLE_RECEIVED_IN_LAB",
            "sample_id": sample_id,
            "sample_type": sample_type or "blood",
            "sample_condition": sample_condition or "good",
            "collected_by": collected_by,
            "collection_time": now.isoformat(),
            "collection_end_time": now,
            "updated_at": now,
        }}
    )
    await admin_controller.log_activity(collected_by, "Lab", f"Sample collected for {request_id} ({sample_id})")
    return True, sample_id


async def mark_test_in_process(request_id: str, updated_by: str):
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req or req.get("status") not in ("SAMPLE_COLLECTED", "SAMPLE_RECEIVED_IN_LAB"):
        return False
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {"status": "TEST_IN_PROCESS", "updated_at": datetime.utcnow(), "updated_by": updated_by}}
    )
    return True


async def enter_results(request_id: str, results: list, entered_by: str):
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req:
        return False, "Request not found"
    status = req.get("status")
    if status not in ("SAMPLE_COLLECTED", "SAMPLE_RECEIVED_IN_LAB", "TEST_IN_PROCESS"):
        return False, "Invalid status for result entry"
    now = datetime.utcnow()
    catalog_map = {}
    for c in await db[COLL_CATALOG].find({}).to_list(length=500):
        catalog_map[str(c.get("_id", ""))] = c
        catalog_map[c.get("test_name", "")] = c
    critical_alerts = []
    for r in results:
        tid = r.get("test_catalog_id") or r.get("test_name")
        cat = catalog_map.get(tid) or next((v for k, v in catalog_map.items() if v.get("test_name") == tid), None)
        val = r.get("value")
        val_txt = r.get("value_text")
        is_abnormal = r.get("is_abnormal", False)
        is_critical = r.get("is_critical", False)
        ref_range = r.get("reference_range")
        unit_val = r.get("unit", "")
        if cat:
            cmin, cmax = cat.get("critical_min"), cat.get("critical_max")
            if val is not None and (cmin is not None and val < cmin or cmax is not None and val > cmax):
                is_critical = True
                critical_alerts.append({"test": cat.get("test_name"), "value": val, "range": f"{cmin}-{cmax}"})
            if not ref_range and cat.get("reference_range_text"):
                ref_range = cat.get("reference_range_text")
            elif not ref_range and cat.get("reference_range_min") is not None and cat.get("reference_range_max") is not None:
                ref_range = f"{cat['reference_range_min']}-{cat['reference_range_max']}"
            if not unit_val and cat.get("unit"):
                unit_val = cat.get("unit", "")
        await db[COLL_RESULTS].insert_one({
            "request_id": request_id,
            "test_catalog_id": tid,
            "value": val,
            "value_text": val_txt,
            "unit": unit_val,
            "reference_range": ref_range,
            "is_abnormal": is_abnormal,
            "is_critical": is_critical,
            "entered_by": entered_by,
            "entered_at": now,
            "file_attachment_url": r.get("file_attachment_url"),
        })
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {"status": "RESULTS_ENTERED", "updated_at": now, "results_entered_by": entered_by}}
    )
    if critical_alerts:
        await _notify_doctor_critical(request_id, req.get("doctor_id"), req.get("patient_name"), critical_alerts)
    await admin_controller.log_activity(entered_by, "Lab", f"Entered results for {request_id}" + (" (CRITICAL)" if critical_alerts else ""))
    return True, critical_alerts


async def _notify_doctor_critical(request_id: str, doctor_id: str, patient_name: str, alerts: list):
    db = get_db()
    msg = f"CRITICAL: Patient {patient_name}, Request {request_id}. " + "; ".join(f"{a['test']}={a['value']} (ref: {a['range']})" for a in alerts)
    await db[COLL_NOTIFICATIONS].insert_one({
        "request_id": request_id,
        "recipient_type": "doctor",
        "recipient_id": doctor_id or "",
        "message": msg,
        "is_read": False,
        "is_critical": True,
        "created_at": datetime.utcnow(),
    })


async def get_results(request_id: str):
    db = get_db()
    cursor = db[COLL_RESULTS].find({"request_id": request_id}).sort("entered_at", -1)
    out = []
    async for doc in cursor:
        out.append(_serialize_doc(doc))
    return out


async def generate_report_and_bill(request_id: str, generated_by: str):
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req or req.get("status") != "RESULTS_ENTERED":
        return False, "Invalid or wrong status"
    now = datetime.utcnow()
    report_url = f"/api/lab/reports/{request_id}/download"
    await db[COLL_REPORTS].insert_one({
        "request_id": request_id,
        "pdf_url": report_url,
        "generated_at": now,
        "generated_by": generated_by,
        "shared_to_doctor": True,
        "shared_to_patient": True,
    })
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {"status": "REPORT_READY", "updated_at": now, "report_generated_at": now}}
    )
    await _notify_doctor_report_ready(request_id, req.get("doctor_id"), req.get("patient_name"))
    await _notify_patient_report_ready(request_id, req.get("patient_id") or req.get("uhid"), req.get("patient_name"))
    try:
        await _create_bill_for_lab_request(db, req)
    except Exception as e:
        await admin_controller.log_activity("Lab", "Lab", f"Billing auto-create failed for {request_id}: {e}")
    await admin_controller.log_activity(generated_by, "Lab", f"Report ready for {request_id}")
    return True, report_url


async def _create_bill_for_lab_request(db, req):
    from app.controllers import billing_controller
    request_id = req.get("request_id")
    tests_ordered = req.get("tests_ordered") or []
    catalog = await db[COLL_CATALOG].find({}).to_list(length=500)
    name_to_price = {c.get("test_name"): c.get("price", 0) for c in catalog}
    config = await admin_controller.get_system_config()
    lab_base_fee = config.get("lab_base_fee", 300)
    
    items = []
    subtotal = 0
    
    # Add Lab Base Fee
    if lab_base_fee > 0:
        items.append({"category": "Lab", "item_name": "Lab Base/Collection Fee", "quantity": 1, "price": float(lab_base_fee), "tax": 0, "total": float(lab_base_fee)})
        subtotal += lab_base_fee

    for t in tests_ordered:
        price = name_to_price.get(t, 0)
        items.append({"category": "Lab", "item_name": t, "quantity": 1, "price": float(price), "tax": 0, "total": float(price)})
        subtotal += price
    payload = {
        "patient_id": req.get("patient_id"),
        "uhid": req.get("uhid"),
        "subtotal": subtotal,
        "tax": 0,
        "discount": 0,
        "total": subtotal,
        "insurance_covered": 0,
        "patient_payable": subtotal,
        "due_amount": subtotal,
        "items": items,
        "created_by": "Lab System",
        "visit_id": request_id,
    }
    await billing_controller.create_bill(payload)


async def _notify_doctor_report_ready(request_id: str, doctor_id: str, patient_name: str):
    db = get_db()
    await db[COLL_NOTIFICATIONS].insert_one({
        "request_id": request_id,
        "recipient_type": "doctor",
        "recipient_id": doctor_id or "",
        "message": f"Lab report ready for {patient_name} (Request {request_id}).",
        "is_read": False,
        "is_critical": False,
        "created_at": datetime.utcnow(),
    })


async def _notify_patient_report_ready(request_id: str, patient_id: str, patient_name: str):
    db = get_db()
    await db[COLL_NOTIFICATIONS].insert_one({
        "request_id": request_id,
        "recipient_type": "patient",
        "recipient_id": patient_id or "",
        "message": f"Your lab report for request {request_id} is ready. You can download it from My Lab Tests or Records.",
        "is_read": False,
        "is_critical": False,
        "created_at": datetime.utcnow(),
    })


async def send_report_to_patient(request_id: str, sent_by: str):
    """Mark report as sent to patient and notify them. Lab assistant explicitly sends so patient can see in portal."""
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req:
        return False, "Request not found"
    if req.get("status") != "REPORT_READY":
        return False, "Report must be generated first (status REPORT_READY)"
    now = datetime.utcnow()
    patient_id = req.get("patient_id") or req.get("uhid")
    patient_name = req.get("patient_name") or "Patient"
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {
            "report_sent_to_patient": True,
            "report_sent_to_patient_at": now,
            "report_sent_to_patient_by": sent_by,
            "updated_at": now,
        }}
    )
    await db[COLL_REPORTS].update_many(
        {"request_id": request_id},
        {"$set": {"shared_to_patient": True, "shared_to_patient_at": now}}
    )
    await _notify_patient_report_ready(request_id, patient_id, patient_name)
    await admin_controller.log_activity(sent_by, "Lab", f"Sent lab report {request_id} to patient {patient_name}")
    return True, None


async def send_report_to_doctor(request_id: str, sent_by: str):
    """Mark report as sent to doctor and notify them. Lab assistant explicitly sends so doctor sees it in Lab Orders."""
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req:
        return False, "Request not found"
    if req.get("status") != "REPORT_READY":
        return False, "Report must be generated first (status REPORT_READY)"
    now = datetime.utcnow()
    doctor_id = req.get("doctor_id") or ""
    patient_name = req.get("patient_name") or "Patient"
    
    # Chougule team logic: if report is for either Dr. PM or Dr. Nikhil, notify both.
    # We identify them by their fixed usernames/names as per system requirements.
    # Note: In a production system, this would ideally be handled via a 'team' or 'group' entity.
    team_doctor_ids = []
    
    # Fetch team members from users to get their IDs
    chougule_users = await db["users"].find({"username": {"$in": ["pmchougule", "nikhilchougule"]}}).to_list(length=10)
    chougule_ids = [str(u["_id"]) for u in chougule_users]
    
    if doctor_id in chougule_ids:
        team_doctor_ids = chougule_ids
    else:
        team_doctor_ids = [doctor_id]

    await db["lab_test_requests"].update_one(
        {"request_id": request_id},
        {"$set": {
            "report_sent_to_doctor": True,
            "report_sent_to_doctor_at": now,
            "report_sent_to_doctor_by": sent_by,
            "updated_at": now,
        }}
    )
    await db["lab_reports"].update_many(
        {"request_id": request_id},
        {"$set": {"shared_to_doctor": True, "shared_to_doctor_at": now}}
    )
    
    for tid in team_doctor_ids:
        if tid:
            await _notify_doctor_report_ready(request_id, tid, patient_name)
    
    await admin_controller.log_activity(sent_by, "Lab", f"Sent lab report {request_id} to doctor for {patient_name}")
    return True, None


async def get_waiting_patients(today_only: bool = True):
    """Patients referred to lab but not yet checked in (REFERRED_TO_LAB) and patients at lab waiting for sample (PATIENT_ARRIVED_AT_LAB)."""
    db = get_db()
    q = {"status": {"$in": ["REFERRED_TO_LAB", "PATIENT_ARRIVED_AT_LAB"]}, "no_show_flag": {"$ne": True}}
    if today_only:
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        q["$and"] = [
            {"$or": [{"referred_to_lab_at": {"$gte": start}}, {"referred_to_lab_at": {"$exists": False}, "created_at": {"$gte": start}}]}
        ]
    cursor = db[COLL_REQUESTS].find(q).sort("lab_token_number", 1)
    out = []
    async for doc in cursor:
        out.append(_serialize_doc(doc))
    return out


async def get_token_display(today_only: bool = True):
    """Now serving (current token), Next (next in queue). Based on PATIENT_ARRIVED_AT_LAB / SAMPLE_COLLECTION_IN_PROCESS by token order."""
    db = get_db()
    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) if today_only else None
    q = {"status": {"$in": ["PATIENT_ARRIVED_AT_LAB", "SAMPLE_COLLECTION_IN_PROCESS"]}}
    if start:
        q["$or"] = [{"referred_to_lab_at": {"$gte": start}}, {"created_at": {"$gte": start}}]
    cursor = db[COLL_REQUESTS].find(q).sort("lab_token_number", 1).limit(2)
    tokens = []
    async for doc in cursor:
        tokens.append(doc.get("lab_token_number"))
    now_serving = tokens[0] if tokens else None
    next_token = tokens[1] if len(tokens) > 1 else None
    return {"now_serving": now_serving, "next": next_token}


async def get_average_wait_time_today():
    """Average wait time (minutes) from lab_visit_logs for today."""
    db = get_db()
    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    cursor = db[COLL_VISIT_LOGS].find({"created_at": {"$gte": start}})
    total = 0
    count = 0
    async for doc in cursor:
        total += doc.get("wait_time_minutes", 0)
        count += 1
    return round(total / count, 1) if count else 0


async def mark_no_show(request_id: str, marked_by: str):
    """Mark request as no-show and notify doctor."""
    db = get_db()
    req = await db[COLL_REQUESTS].find_one({"request_id": request_id})
    if not req or req.get("status") != "REFERRED_TO_LAB":
        return False, "Invalid or wrong status"
    await db[COLL_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {"no_show_flag": True, "no_show_at": datetime.utcnow(), "no_show_marked_by": marked_by, "updated_at": datetime.utcnow()}}
    )
    await db[COLL_NOTIFICATIONS].insert_one({
        "request_id": request_id,
        "recipient_type": "doctor",
        "recipient_id": req.get("doctor_id") or "",
        "message": f"Patient {req.get('patient_name')} did not report to lab (Request {request_id}).",
        "is_read": False,
        "is_critical": False,
        "created_at": datetime.utcnow(),
    })
    await admin_controller.log_activity(marked_by, "Lab", f"Marked no-show for {request_id}")
    return True, None


async def process_no_shows(hours: float = None):
    """Mark REFERRED_TO_LAB older than X hours as no-show. Returns count marked."""
    db = get_db()
    threshold_hours = hours if hours is not None else NO_SHOW_HOURS_DEFAULT
    cutoff = datetime.utcnow() - timedelta(hours=threshold_hours)
    cursor = db[COLL_REQUESTS].find({
        "status": "REFERRED_TO_LAB",
        "no_show_flag": {"$ne": True},
        "referred_to_lab_at": {"$lt": cutoff},
    })
    count = 0
    async for req in cursor:
        await db[COLL_REQUESTS].update_one(
            {"request_id": req["request_id"]},
            {"$set": {"no_show_flag": True, "no_show_at": datetime.utcnow(), "no_show_marked_by": "System", "updated_at": datetime.utcnow()}}
        )
        await db[COLL_NOTIFICATIONS].insert_one({
            "request_id": req["request_id"],
            "recipient_type": "doctor",
            "recipient_id": req.get("doctor_id") or "",
            "message": f"Patient {req.get('patient_name')} did not report to lab (Request {req['request_id']}).",
            "is_read": False,
            "is_critical": False,
            "created_at": datetime.utcnow(),
        })
        count += 1
    return count


async def get_critical_alerts(today_only: bool = True):
    db = get_db()
    q = {"is_critical": True}
    if today_only:
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        q["created_at"] = {"$gte": start}
    cursor = db[COLL_NOTIFICATIONS].find(q).sort("created_at", -1).limit(50)
    out = []
    async for doc in cursor:
        out.append(_serialize_doc(doc))
    return out


async def get_notifications_for_recipient(recipient_type: str, recipient_id: str, is_read: bool = None):
    db = get_db()
    q = {"recipient_type": recipient_type, "recipient_id": recipient_id}
    if is_read is not None:
        q["is_read"] = is_read
    cursor = db[COLL_NOTIFICATIONS].find(q).sort("created_at", -1).limit(100)
    out = []
    async for doc in cursor:
        out.append(_serialize_doc(doc))
    return out


async def get_lab_stats(today_only: bool = True):
    db = get_db()
    await seed_catalog_if_empty()
    q = {}
    if today_only:
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        q["created_at"] = {"$gte": start}
    
    total_today = await db[COLL_REQUESTS].count_documents(q)
    
    # Auto-seed dummy data if no requests exist for today (for demo/live data requirement)
    if today_only and total_today == 0:
        await seed_dummy_lab_data()
        total_today = await db[COLL_REQUESTS].count_documents(q)

    pending = await db[COLL_REQUESTS].count_documents({**q, "status": {"$in": ["REQUESTED", "ACKNOWLEDGED", "REFERRED_TO_LAB", "SAMPLE_COLLECTION_IN_PROCESS"]}})
    referred_waiting = await db[COLL_REQUESTS].count_documents({**q, "status": "REFERRED_TO_LAB", "no_show_flag": {"$ne": True}})
    waiting_at_lab = await db[COLL_REQUESTS].count_documents({**q, "status": "PATIENT_ARRIVED_AT_LAB"})
    in_process = await db[COLL_REQUESTS].count_documents({**q, "status": "TEST_IN_PROCESS"})
    results_entered = await db[COLL_REQUESTS].count_documents({**q, "status": "RESULTS_ENTERED"})
    reports_ready = await db[COLL_REQUESTS].count_documents({**q, "status": "REPORT_READY"})
    start_alert = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) if today_only else datetime.utcnow() - timedelta(days=7)
    critical_count = await db[COLL_NOTIFICATIONS].count_documents({"is_critical": True, "created_at": {"$gte": start_alert}})
    avg_wait = await get_average_wait_time_today()
    return {
        "total_requests_today": total_today,
        "pending_sample_collection": pending,
        "referred_waiting": referred_waiting,
        "waiting_at_lab": waiting_at_lab,
        "tests_in_process": in_process,
        "results_entered": results_entered,
        "reports_ready_today": reports_ready,
        "critical_alerts": critical_count,
        "average_wait_time_minutes": avg_wait,
    }


# ---------- Dummy data seed ----------
DUMMY_REQUEST_IDS = ["LAB-DMY-001", "LAB-DMY-002", "LAB-DMY-003", "LAB-DMY-004", "LAB-DMY-005", "LAB-DMY-006", "LAB-DMY-007", "LAB-DMY-008", "LAB-DMY-009", "LAB-DMY-010"]


async def seed_dummy_lab_data():
    """Insert dummy lab test requests, samples, results, and reports for today's demo."""
    db = get_db()
    await seed_catalog_if_empty()
    now = datetime.utcnow()
    today_str = now.strftime("%Y%m%d")

    # Check if we already seeded today (to avoid duplicates on every stats call)
    existing = await db[COLL_REQUESTS].find_one({"request_id": {"$regex": f"^LAB-DMY-{today_str}"}})
    if existing:
        return

    patient = await db["patients"].find_one()
    doctor = await db["doctors"].find_one()
    patient_id = str(patient["_id"]) if patient else "dummy-patient"
    patient_name = (patient or {}).get("name") or (patient or {}).get("patientName") or "Ramesh Kumar"
    uhid = (patient or {}).get("uhid") or "UHID-DEMO-001"
    doctor_id = str(doctor["_id"]) if doctor else "dummy-doctor"
    doctor_name = (doctor or {}).get("name") or "Dr. Sharma"

    # Pre-dated times for realistic wait times and queue sorting
    h1 = now - timedelta(hours=1)
    h2 = now - timedelta(hours=2)
    m30 = now - timedelta(minutes=30)
    m15 = now - timedelta(minutes=15)

    dummy_requests = [
        {"request_id": f"LAB-DMY-{today_str}-001", "status": "REQUESTED", "tests_ordered": ["CBC", "Blood Sugar (F/R/PP)"], "created_at": m15},
        {"request_id": f"LAB-DMY-{today_str}-002", "status": "ACKNOWLEDGED", "tests_ordered": ["TSH", "T3", "T4"], "created_at": m30},
        {"request_id": f"LAB-DMY-{today_str}-003", "status": "SAMPLE_COLLECTION_IN_PROCESS", "tests_ordered": ["Lithium", "RFT"], "created_at": h1},
        {"request_id": f"LAB-DMY-{today_str}-004", "status": "SAMPLE_COLLECTED", "tests_ordered": ["LFT", "Lipid Panel"], "sample_id": f"SMP-D-{today_str}-04", "created_at": h2},
        {"request_id": f"LAB-DMY-{today_str}-005", "status": "TEST_IN_PROCESS", "tests_ordered": ["Urine Drug Screen", "Routine Urine Analysis"], "sample_id": f"SMP-D-{today_str}-05", "created_at": h2},
        {"request_id": f"LAB-DMY-{today_str}-006", "status": "RESULTS_ENTERED", "tests_ordered": ["CBC", "Vitamin B12"], "sample_id": f"SMP-D-{today_str}-06", "created_at": h2},
        {"request_id": f"LAB-DMY-{today_str}-007", "status": "REPORT_READY", "tests_ordered": ["Lithium", "TSH"], "sample_id": f"SMP-D-{today_str}-07", "created_at": h2},
        {"request_id": f"LAB-DMY-{today_str}-008", "status": "REPORT_READY", "tests_ordered": ["CBC", "LFT", "RFT"], "sample_id": f"SMP-D-{today_str}-08", "created_at": h2},
        {"request_id": f"LAB-DMY-{today_str}-009", "status": "REFERRED_TO_LAB", "tests_ordered": ["CBC", "TSH"], "created_at": m30, "lab_token_number": 101, "referred_to_lab_at": m30},
        {"request_id": f"LAB-DMY-{today_str}-010", "status": "PATIENT_ARRIVED_AT_LAB", "tests_ordered": ["Blood Sugar (F/R/PP)"], "created_at": h1, "lab_token_number": 102, "referred_to_lab_at": h1, "patient_arrived_at": m30, "checked_in_by": "Lab Assistant"},
    ]

    for d in dummy_requests:
        doc = {
            "request_id": d["request_id"],
            "patient_id": patient_id,
            "uhid": uhid,
            "patient_name": patient_name,
            "patient_age": 35,
            "patient_sex": "Male",
            "ward_room": "Ward A / Bed 12",
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "tests_ordered": d["tests_ordered"],
            "clinical_notes": "Demo data generated automatically for today.",
            "status": d["status"],
            "created_at": d["created_at"],
            "updated_at": now,
        }
        if d.get("sample_id"):
            doc["sample_id"] = d["sample_id"]
            doc["sample_type"] = "blood"
            doc["collected_by"] = "Lab Assistant"
            doc["collection_time"] = now.isoformat()
        if d.get("lab_token_number") is not None:
            doc["lab_token_number"] = d["lab_token_number"]
        if d.get("referred_to_lab_at"):
            doc["referred_to_lab_at"] = d.get("referred_to_lab_at")
        if d.get("patient_arrived_at"):
            doc["patient_arrived_at"] = d.get("patient_arrived_at")
        if d.get("checked_in_by"):
            doc["checked_in_by"] = d.get("checked_in_by")
        
        await db[COLL_REQUESTS].insert_one(doc)

    # Seed samples, results, reports, notifications
    for req in dummy_requests:
        rid = req["request_id"]
        if req["status"] in ("SAMPLE_COLLECTED", "TEST_IN_PROCESS", "RESULTS_ENTERED", "REPORT_READY") and req.get("sample_id"):
            await db[COLL_SAMPLES].insert_one({
                "request_id": rid,
                "sample_id": req["sample_id"],
                "sample_type": "blood",
                "collected_by": "Lab Assistant",
                "collection_end_time": now,
                "sample_condition": "good",
                "created_at": now,
            })

        if req["status"] in ("RESULTS_ENTERED", "REPORT_READY"):
            for test_name in req["tests_ordered"]:
                if test_name == "Lithium":
                    val, val_txt, unit, ref = 0.9, None, "mEq/L", "0.6-1.2"
                elif test_name == "TSH":
                    val, val_txt, unit, ref = 2.5, None, "mIU/L", "0.4-4.0"
                elif test_name == "Vitamin B12":
                    val, val_txt, unit, ref = 85, None, "pg/mL", "200-900" 
                elif test_name == "CBC":
                    val, val_txt, unit, ref = 12.5, None, "g/dL", "12-16"
                else:
                    val, val_txt, unit, ref = 95, None, "mg/dL", "70-100"
                
                await db[COLL_RESULTS].insert_one({
                    "request_id": rid,
                    "test_catalog_id": test_name,
                    "value": val,
                    "value_text": val_txt,
                    "unit": unit,
                    "reference_range": ref,
                    "is_abnormal": (val < 100) if val else False,
                    "is_critical": False,
                    "entered_by": "Lab Assistant",
                    "entered_at": now,
                })

        if req["status"] == "REPORT_READY":
            await db[COLL_REPORTS].insert_one({
                "request_id": rid,
                "pdf_url": f"/api/lab/reports/{rid}/download",
                "generated_at": now,
                "generated_by": "Lab Assistant",
                "shared_to_doctor": True,
                "shared_to_patient": True,
            })

    # Seed a critical notification for today
    await db[COLL_NOTIFICATIONS].insert_one({
        "request_id": f"LAB-DMY-{today_str}-006",
        "recipient_type": "doctor",
        "recipient_id": doctor_id,
        "message": f"CRITICAL: Patient {patient_name}, Request LAB-DMY-{today_str}-006. Vitamin B12=85 (ref: 200-900)",
        "is_read": False,
        "is_critical": True,
        "created_at": now,
    })

    # Seed a visit log for wait time calculation
    await db[COLL_VISIT_LOGS].insert_one({
        "request_id": f"LAB-DMY-{today_str}-010",
        "token_number": 102,
        "arrival_time": m30,
        "checked_in_by": "Lab Assistant",
        "wait_time_minutes": 30,
        "created_at": now,
    })

    await admin_controller.log_activity("System", "Lab", f"Auto-seeded live dummy data for {today_str}")


# ---------- Legacy compatibility (lab_requests) ----------
async def create_lab_request(uhid: str, patient_name: str, tests: str, source: str = "OPD", priority: str = "Normal"):
    db = get_db()
    order_id = f"ORD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    request_doc = {
        "orderId": order_id,
        "uhid": uhid,
        "patientName": patient_name,
        "tests": tests,
        "source": source,
        "priority": priority,
        "status": "ORDERED",
        "created_at": datetime.utcnow(),
        "results": [],
    }
    result = await db["lab_requests"].insert_one(request_doc)
    request_doc["_id"] = str(result.inserted_id)
    await admin_controller.log_activity("System/Doctor", "Clinical", f"Created lab order {order_id} for {patient_name} ({uhid})")
    return request_doc


async def get_lab_requests(status: str = None, skip: int = 0, limit: int = 100):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    cursor = db["lab_requests"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items


async def get_lab_request_by_order_id(order_id: str):
    db = get_db()
    doc = await db["lab_requests"].find_one({"orderId": order_id})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def update_lab_status(order_id: str, status: str, sample_id: str = None, collection_time: str = None):
    db = get_db()
    update_data = {"status": status, "updated_at": datetime.utcnow()}
    if sample_id:
        update_data["sampleId"] = sample_id
    if collection_time:
        update_data["collectionTime"] = collection_time
    result = await db["lab_requests"].update_one({"orderId": order_id}, {"$set": update_data})
    if result.modified_count > 0:
        await admin_controller.log_activity("System/Lab", "Lab", f"Updated lab order {order_id} status to {status}")
        return True
    return False


async def save_lab_results(order_id: str, results: list, status: str = "VERIFIED"):
    db = get_db()
    result = await db["lab_requests"].update_one(
        {"orderId": order_id},
        {"$set": {"results": results, "status": status, "updated_at": datetime.utcnow(), "verified_at": datetime.utcnow() if status == "VERIFIED" else None}},
    )
    if result.modified_count > 0:
        await admin_controller.log_activity("System/Lab", "Lab", f"Saved results for lab order {order_id} - status: {status}")
        return True
    return False
