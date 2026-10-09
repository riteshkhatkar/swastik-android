from app.config.database import get_db
from app.controllers import admin_controller
from bson import ObjectId
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Any, List


async def _next_seq(collection_name: str):
    db = get_db()
    doc = await db["counters"].find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return doc["seq"]


async def _audit(entity_type: str, entity_id: str, action: str, user_id: Optional[str] = None, user_name: Optional[str] = None, role: Optional[str] = None, changes: Optional[dict] = None):
    db = get_db()
    await db["emr_audit_log"].insert_one({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "user_id": user_id,
        "user_name": user_name,
        "role": role,
        "changes": changes or {},
        "timestamp": datetime.utcnow(),
    })


def _serialize_doc(doc, id_key="_id"):
    if doc is None:
        return None
    doc = dict(doc)
    if id_key in doc and hasattr(doc[id_key], "__str__"):
        doc["id"] = str(doc.pop(id_key))
    elif "_id" in doc:
        doc["id"] = str(doc["_id"])
    for key in ("created_at", "updated_at", "session_date", "signed_at", "due_date", "result_date", "recorded_at", "admission_date", "timestamp"):
        val = doc.get(key)
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc


# ─── Admissions ─────────────────────────────────────────────────────────────
async def create_admission(uhid: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    seq = await _next_seq("admission_id")
    admission_id = f"ADM-{datetime.utcnow().year}-{seq:05d}"
    now = datetime.utcnow()
    doc: dict[str, Any] = {
        "admission_id": admission_id,
        "uhid": uhid,
        "ward": data.get("ward"),
        "bed": data.get("bed"),
        "admission_date": now,
        "admission_reason": data.get("admission_reason"),
        "clinical_status": data.get("clinical_status") or "Under Observation",
        "care_team": data.get("care_team") or [],
        "status": "active",
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
        "updated_by": created_by,
    }
    await db["emr_admissions"].insert_one(doc)
    await _audit("admission", admission_id, "create", created_by, changes=data)
    return _serialize_doc(doc)


async def get_active_admission(uhid: str) -> Optional[dict]:
    db = get_db()
    doc = await db["emr_admissions"].find_one({"uhid": uhid, "status": "active"}, sort=[("created_at", -1)])
    return _serialize_doc(doc)


async def get_admission_by_id(admission_id: str):
    db = get_db()
    doc = await db["emr_admissions"].find_one({"admission_id": admission_id})
    return _serialize_doc(doc)


async def list_admissions(uhid: str):
    db = get_db()
    cursor = db["emr_admissions"].find({"uhid": uhid}).sort("created_at", -1)
    out = []
    async for doc in cursor:
        out.append(_serialize_doc(doc))
    return out


async def update_admission(admission_id: str, data: dict, updated_by: Optional[str] = None):
    db = get_db()
    update = {
        "updated_at": datetime.utcnow(),
        "updated_by": updated_by,
    }
    if "ward" in data: update["ward"] = data["ward"]
    if "bed" in data: update["bed"] = data["bed"]
    if "clinical_status" in data: update["clinical_status"] = data["clinical_status"]
    if "care_team" in data: update["care_team"] = data["care_team"]
    r = await db["emr_admissions"].update_one({"admission_id": admission_id}, {"$set": update})
    if r.modified_count:
        await _audit("admission", admission_id, "update", updated_by, changes=data)
    return await get_admission_by_id(admission_id)


# ─── Symptoms & HPI ────────────────────────────────────────────────────────
async def save_symptoms_hpi(uhid: str, admission_id: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "chief_complaint": data.get("chief_complaint"),
        "onset": data.get("onset"),
        "duration": data.get("duration"),
        "precipitating_factors": data.get("precipitating_factors"),
        "perpetuating_factors": data.get("perpetuating_factors"),
        "hpi": data.get("hpi"),
        "suicidal_ideation": data.get("suicidal_ideation"),
        "self_harm_history": data.get("self_harm_history"),
        "harm_to_others_risk": data.get("harm_to_others_risk"),
        "summary": data.get("summary"),
        "version": await _next_seq(f"symptoms_hpi_{admission_id}"),
        "created_at": now,
        "created_by": created_by,
    }
    await db["emr_symptoms_hpi"].insert_one(doc)
    await _audit("symptoms_hpi", str(doc["_id"]), "create", created_by, changes=data)
    return _serialize_doc(doc)


async def get_symptoms_hpi(uhid: str, admission_id: str):
    db = get_db()
    doc = await db["emr_symptoms_hpi"].find_one({"uhid": uhid, "admission_id": admission_id}, sort=[("created_at", -1)])
    if not doc:
        doc = await db["emr_symptoms_hpi"].find_one({"uhid": uhid}, sort=[("created_at", -1)])
    return _serialize_doc(doc)


async def get_symptoms_hpi_history(uhid: str, admission_id: str):
    db = get_db()
    cursor = db["emr_symptoms_hpi"].find({"uhid": uhid, "admission_id": admission_id}).sort("created_at", -1).limit(20)
    return [_serialize_doc(d) async for d in cursor]


# ─── MSE ─────────────────────────────────────────────────────────────────────
async def save_mse(uhid: str, admission_id: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "session_date": data.get("session_date") or now,
        "appearance": data.get("appearance") or [],
        "psychomotor": data.get("psychomotor") or [],
        "speech": data.get("speech") or [],
        "mood": data.get("mood") or [],
        "affect": data.get("affect") or [],
        "thought_process": data.get("thought_process") or [],
        "thought_content": data.get("thought_content") or [],
        "perception": data.get("perception") or [],
        "cognition": data.get("cognition") or [],
        "insight": data.get("insight") or [],
        "judgment": data.get("judgment") or [],
        "attention": data.get("attention") or [],
        "free_text_overrides": data.get("free_text_overrides") or {},
        "summary": data.get("summary"),
        "dangerous_flags": data.get("dangerous_flags") or [],
        "version": await _next_seq(f"mse_{admission_id}"),
        "created_at": now,
        "created_by": created_by,
    }
    await db["emr_mse"].insert_one(doc)
    await _audit("mse", str(doc["_id"]), "create", created_by, changes=data)
    return _serialize_doc(doc)


async def get_mse_latest(uhid: str, admission_id: str):
    db = get_db()
    doc = await db["emr_mse"].find_one({"uhid": uhid, "admission_id": admission_id}, sort=[("created_at", -1)])
    if not doc:
        doc = await db["emr_mse"].find_one({"uhid": uhid}, sort=[("created_at", -1)])
    return _serialize_doc(doc)


async def get_mse_history(uhid: str, admission_id: str):
    db = get_db()
    cursor = db["emr_mse"].find({"uhid": uhid, "admission_id": admission_id}).sort("created_at", -1).limit(50)
    return [_serialize_doc(d) async for d in cursor]


# ─── Diagnosis ───────────────────────────────────────────────────────────────
async def save_diagnosis(uhid: str, admission_id: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "primary_diagnosis": data.get("primary_diagnosis"),
        "differential": data.get("differential") or [],
        "severity": data.get("severity"),
        "specifier": data.get("specifier"),
        "system_used": data.get("system_used") or data.get("system"),
        "formulation_bio_psycho_social": data.get("formulation_bio_psycho_social"),
        "version": await _next_seq(f"diagnosis_{admission_id}"),
        "created_at": now,
        "created_by": created_by,
    }
    await db["emr_diagnoses"].insert_one(doc)
    await _audit("diagnosis", str(doc["_id"]), "create", created_by, changes=data)
    return _serialize_doc(doc)


async def get_diagnosis_latest(uhid: str, admission_id: str):
    db = get_db()
    doc = await db["emr_diagnoses"].find_one({"uhid": uhid, "admission_id": admission_id}, sort=[("created_at", -1)])
    if not doc:
        doc = await db["emr_diagnoses"].find_one({"uhid": uhid}, sort=[("created_at", -1)])
    return _serialize_doc(doc)


async def get_diagnosis_history(uhid: str, admission_id: str):
    db = get_db()
    cursor = db["emr_diagnoses"].find({"uhid": uhid, "admission_id": admission_id}).sort("created_at", -1).limit(20)
    return [_serialize_doc(d) async for d in cursor]


# ─── Risk Assessment ────────────────────────────────────────────────────────
async def save_risk_assessment(uhid: str, admission_id: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "suicide_risk": data.get("suicide_risk"),  # Part of "Risk to Self"
        "self_harm_risk": data.get("self_harm_risk"), # Part of "Risk to Self"
        "violence_risk": data.get("violence_risk"), # Part of "Risk to Others"
        "aggression_risk": data.get("aggression_risk"), # Part of "Risk to Others"
        "elopement_risk": data.get("elopement_risk"), # Part of "Risk of Vulnerability"
        "self_neglect_risk": data.get("self_neglect_risk"), # Part of "Risk of Vulnerability"
        
        # 3-Axis Summary Scores (0-100 or Low/Med/High)
        "risk_to_self": data.get("risk_to_self"),
        "risk_to_others": data.get("risk_to_others"),
        "risk_to_vulnerability": data.get("risk_to_vulnerability"),

        "auto_calculated": data.get("auto_calculated") or {},
        "manual_override": data.get("manual_override", False),
        "safety_plan_required": data.get("safety_plan_required"),
        "safety_plan_done": data.get("safety_plan_done"),
        "version": await _next_seq(f"risk_{admission_id}"),
        "created_at": now,
        "created_by": created_by,
    }
    await db["emr_risk_assessments"].insert_one(doc)
    await _audit("risk_assessment", str(doc["_id"]), "create", created_by, changes=data)
    return _serialize_doc(doc)


async def get_risk_latest(uhid: str, admission_id: str):
    db = get_db()
    doc = await db["emr_risk_assessments"].find_one({"uhid": uhid, "admission_id": admission_id}, sort=[("created_at", -1)])
    if not doc:
        doc = await db["emr_risk_assessments"].find_one({"uhid": uhid}, sort=[("created_at", -1)])
    return _serialize_doc(doc)


async def get_risk_history(uhid: str, admission_id: str):
    db = get_db()
    cursor = db["emr_risk_assessments"].find({"uhid": uhid, "admission_id": admission_id}).sort("created_at", -1).limit(20)
    return [_serialize_doc(d) async for d in cursor]


# ─── Medications ────────────────────────────────────────────────────────────
async def add_medication(uhid: str, admission_id: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "drug_name": data.get("drug_name"),
        "dose": data.get("dose"),
        "frequency": data.get("frequency"),
        "route": data.get("route") or "PO",
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "prescribing_doctor_id": data.get("prescribing_doctor_id"),
        "prescribing_doctor_name": data.get("prescribing_doctor_name"),
        "status": data.get("status") or "Active",
        "prn": data.get("prn", False),
        "allergy_flag": data.get("allergy_flag", False),
        "interaction_alert": data.get("interaction_alert"),
        "lab_monitoring_reminder": data.get("lab_monitoring_reminder"),
        "eps_warning": data.get("eps_warning", False),
        "created_at": now,
        "created_by": created_by,
    }
    await db["emr_medications"].insert_one(doc)
    # Also link to clinical history for patient portal visibility
    await db["clinical_records"].insert_one({
        "uhid": uhid,
        "type": "Medication",
        "data": data,
        "created_at": now
    })
    await _audit("medication", str(doc["_id"]), "create", created_by, changes=data)
    return _serialize_doc(doc)


async def update_medication(medication_id: str, data: dict, updated_by: Optional[str] = None):
    db = get_db()
    update = {"updated_at": datetime.utcnow(), "updated_by": updated_by}
    for k in ["dose", "frequency", "route", "end_date", "status"]:
        if k in data: update[k] = data[k]
    await db["emr_medications"].update_one({"_id": ObjectId(medication_id)}, {"$set": update})
    await _audit("medication", medication_id, "update", updated_by, changes=data)
    doc = await db["emr_medications"].find_one({"_id": ObjectId(medication_id)})
    return _serialize_doc(doc)


async def list_medications(uhid: str, admission_id: Optional[str] = None):
    db = get_db()
    q = {"uhid": uhid}
    if admission_id:
        q["admission_id"] = admission_id
    cursor = db["emr_medications"].find(q).sort("created_at", -1)
    return [_serialize_doc(d) async for d in cursor]


# ─── Lab & Monitoring ───────────────────────────────────────────────────────
async def add_lab_monitoring(uhid: str, admission_id: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "test_type": data.get("test_type"),
        "test_name": data.get("test_name"),
        "value": data.get("value"),
        "unit": data.get("unit"),
        "reference_range": data.get("reference_range"),
        "abnormal": data.get("abnormal", False),
        "due_date": data.get("due_date"),
        "result_date": data.get("result_date"),
        "created_at": now,
        "created_by": created_by,
    }
    await db["emr_lab_monitoring"].insert_one(doc)
    return _serialize_doc(doc)


async def list_lab_monitoring(uhid: str, admission_id: Optional[str] = None):
    db = get_db()
    q = {"uhid": uhid}
    if admission_id:
        q["admission_id"] = admission_id
    cursor = db["emr_lab_monitoring"].find(q).sort("result_date", -1)
    return [_serialize_doc(d) async for d in cursor]


# ─── Treatment Plan ─────────────────────────────────────────────────────────
async def save_treatment_plan(uhid: str, admission_id: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "short_term_goals": data.get("short_term_goals") or [],
        "long_term_goals": data.get("long_term_goals") or [],
        "therapy_modalities": data.get("therapy_modalities") or [],
        "allied_referrals": data.get("allied_referrals") or [],
        "session_frequency": data.get("session_frequency"),
        "assigned_therapist_id": data.get("assigned_therapist_id"),
        "assigned_therapist_name": data.get("assigned_therapist_name"),
        "observation_level": data.get("observation_level"),
        "discharge_criteria": data.get("discharge_criteria") or [],
        "discharge_planning": data.get("discharge_planning"),
        "safety_plan": data.get("safety_plan"),
        "emergency_contacts": data.get("emergency_contacts") or [],
        "version": await _next_seq(f"treatment_plan_{admission_id}"),
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
    }
    await db["emr_treatment_plans"].insert_one(doc)
    # Reflect in clinical history for patient portal access
    await db["clinical_records"].insert_one({
        "uhid": uhid,
        "type": "Treatment Plan",
        "data": data,
        "created_at": now
    })
    await _audit("treatment_plan", str(doc["_id"]), "create", created_by, changes=data)
    return _serialize_doc(doc)


async def get_treatment_plan_latest(uhid: str, admission_id: str):
    db = get_db()
    doc = await db["emr_treatment_plans"].find_one({"uhid": uhid, "admission_id": admission_id}, sort=[("created_at", -1)])
    if not doc:
        doc = await db["emr_treatment_plans"].find_one({"uhid": uhid}, sort=[("created_at", -1)])
    return _serialize_doc(doc)


# ─── Session Notes (SOAP) ───────────────────────────────────────────────────
async def create_session_note(uhid: str, admission_id: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "session_type": data.get("session_type"),
        "session_date": data.get("session_date") or now,
        "subjective": data.get("subjective"),
        "objective": data.get("objective"),
        "assessment": data.get("assessment"),
        "plan": data.get("plan"),
        "role_tag": data.get("role_tag") or "Psychiatrist",
        "draft": data.get("draft", True),
        "signed": data.get("signed", False),
        "signed_at": data.get("signed_at"),
        "signed_by": data.get("signed_by"),
        "locked_after_24h": False,
        "created_at": now,
        "created_by": created_by,
    }
    await db["emr_session_notes"].insert_one(doc)
    await _audit("session_note", str(doc["_id"]), "create", created_by, changes=data)
    return _serialize_doc(doc)


async def update_session_note(note_id: str, data: dict, updated_by: Optional[str] = None):
    db = get_db()
    doc = await db["emr_session_notes"].find_one({"_id": ObjectId(note_id)})
    if not doc:
        return None
    created = doc.get("created_at")
    if created:
        from datetime import timedelta
        if datetime.utcnow() - created > timedelta(hours=24):
            return {"error": "Note locked after 24 hours"}
    update = {"updated_at": datetime.utcnow(), "updated_by": updated_by}
    for k in ["subjective", "objective", "assessment", "plan", "draft", "signed", "signed_at", "signed_by"]:
        if k in data: update[k] = data[k]
    await db["emr_session_notes"].update_one({"_id": ObjectId(note_id)}, {"$set": update})
    await _audit("session_note", note_id, "update", updated_by, changes=data)
    doc = await db["emr_session_notes"].find_one({"_id": ObjectId(note_id)})
    return _serialize_doc(doc)


async def list_session_notes(uhid: str, admission_id: Optional[str] = None):
    db = get_db()
    q = {"uhid": uhid}
    if admission_id:
        q["admission_id"] = admission_id
    cursor = db["emr_session_notes"].find(q).sort("session_date", -1)
    return [_serialize_doc(d) async for d in cursor]


# ─── Vitals ──────────────────────────────────────────────────────────────────
async def add_vitals(uhid: str, admission_id: str, data: dict, recorded_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "admission_id": admission_id,
        "bp_systolic": data.get("bp_systolic"),
        "bp_diastolic": data.get("bp_diastolic"),
        "hr": data.get("hr"),
        "rr": data.get("rr"),
        "temp": data.get("temp"),
        "spo2": data.get("spo2"),
        "weight": data.get("weight"),
        "sleep_hours": data.get("sleep_hours"),
        "appetite": data.get("appetite"),
        "agitation_score": data.get("agitation_score"),
        "recorded_at": now,
        "recorded_by": recorded_by,
    }
    await db["emr_vitals"].insert_one(doc)
    return _serialize_doc(doc)


async def list_vitals(uhid: str, admission_id: Optional[str] = None, limit: int = 100):
    db = get_db()
    q = {"uhid": uhid}
    if admission_id:
        q["admission_id"] = admission_id
    cursor = db["emr_vitals"].find(q).sort("recorded_at", -1).limit(limit)
    return [_serialize_doc(d) async for d in cursor]


# ─── History Events (Timeline) ───────────────────────────────────────────────
async def add_history_event(uhid: str, data: dict, created_by: Optional[str] = None):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "uhid": uhid,
        "event_type": data.get("event_type"),
        "date": data.get("date"),
        "description": data.get("description"),
        "metadata": data.get("metadata") or {},
        "created_at": now,
        "created_by": created_by,
    }
    await db["emr_history_events"].insert_one(doc)
    return _serialize_doc(doc)


async def list_history_events(uhid: str, event_type: Optional[str] = None, year: Optional[int] = None):
    db = get_db()
    q: dict[str, Any] = {"uhid": uhid}
    if event_type:
        q["event_type"] = event_type
    if year:
        q["date"] = {"$regex": str(year)}
    cursor = db["emr_history_events"].find(q).sort("date", -1)
    return [_serialize_doc(d) async for d in cursor]


# ─── EMR Context (sticky header) ─────────────────────────────────────────────
async def get_emr_context(uhid: str):
    """Patient + active admission + care team for sticky header."""
    db = get_db()
    patient = await db["patients"].find_one({"uhid": uhid})
    admission = await get_active_admission(uhid)
    if not admission and patient:
        admission = None
    return {
        "patient": _serialize_doc(patient) if patient else None,
        "admission": admission,
        "editing": [],  # TODO: real-time from WS
        "viewing": [],
        "auto_save_status": None,
    }


# ─── Audit Log ───────────────────────────────────────────────────────────────
async def get_audit_log(entity_type: Optional[str] = None, entity_id: Optional[str] = None, limit: int = 100):
    db = get_db()
    q = {}
    if entity_type:
        q["entity_type"] = entity_type
    if entity_id:
        q["entity_id"] = entity_id
    cursor = db["emr_audit_log"].find(q).sort("timestamp", -1).limit(limit)
    return [_serialize_doc(d) async for d in cursor]


async def get_ward_summary(uhid: str, admission_id: Optional[str] = None):
    db = get_db()
    if not admission_id:
        active = await get_active_admission(uhid)
        if isinstance(active, dict):
            admission_id = active.get("admission_id")
    
    # Fetch tasks
    tasks: List[Optional[Any]] = [
        get_admission_by_id(admission_id) if admission_id else None,
        list_vitals(uhid, admission_id, limit=10),
        list_medications(uhid, admission_id),
        list_lab_monitoring(uhid, admission_id),
        list_session_notes(uhid, admission_id),
        # Also fetch lab orders from the lab_test_requests collection for "Live" status
        db["lab_test_requests"].find({"uhid": uhid}).sort("created_at", -1).limit(20).to_list(None),
    ]
    
    results = await asyncio.gather(*[t for t in tasks if t is not None])
    
    res_idx = 0
    summary: dict[str, Any] = {
        "admission": None,
        "vitals": [],
        "medications": [],
        "labs": [],
        "notes": [],
        "lab_orders": [],
        "diagnosis": None,
        "risk": None,
        "latest_soap": None
    }
    
    if tasks[0] is not None:
        summary["admission"] = results[res_idx]
        res_idx += 1
        
    summary["vitals"] = results[res_idx]
    res_idx += 1
        
    summary["medications"] = results[res_idx]
    res_idx += 1

    summary["labs"] = results[res_idx]
    res_idx += 1

    summary["notes"] = results[res_idx]
    if summary["notes"]:
        # Find latest signed or most recent note
        summary["latest_soap"] = summary["notes"][0]
    res_idx += 1

    summary["lab_orders"] = [_serialize_doc(o) for o in results[res_idx]]
    res_idx += 1
    
    # Pull latest diagnosis/risk (prio to current admission, else latest overall)
    if admission_id:
        summary["diagnosis"] = await get_diagnosis_latest(uhid, admission_id)
        summary["risk"] = await get_risk_latest(uhid, admission_id)
    
    if not summary["diagnosis"]:
        summary["diagnosis"] = await db["emr_diagnoses"].find_one({"uhid": uhid}, sort=[("created_at", -1)])
        summary["diagnosis"] = _serialize_doc(summary["diagnosis"])
        
    if not summary["risk"]:
        summary["risk"] = await db["emr_risk_assessments"].find_one({"uhid": uhid}, sort=[("created_at", -1)])
        summary["risk"] = _serialize_doc(summary["risk"])
    
    return summary


async def get_clinical_timeline(uhid: str, admission_id: Optional[str] = None):
    db = get_db()
    q = {"uhid": uhid}
    if admission_id:
        q["admission_id"] = admission_id
    
    # 1. Fetch from different collections
    vitals = await db["emr_vitals"].find(q).sort("recorded_at", -1).limit(50).to_list(None)
    notes = await db["emr_session_notes"].find(q).sort("session_date", -1).limit(50).to_list(None)
    meds = await db["emr_medications"].find(q).sort("created_at", -1).limit(50).to_list(None)
    labs = await db["emr_lab_monitoring"].find(q).sort("created_at", -1).limit(50).to_list(None)
    diagnosis = await db["emr_diagnoses"].find(q).sort("created_at", -1).limit(50).to_list(None)
    history = await db["emr_history_events"].find(q).sort("date", -1).limit(50).to_list(None)
    
    timeline = []
    
    for v in vitals:
        timeline.append({
            "type": "vitals",
            "time": v.get("recorded_at"),
            "display": f"Vitals recorded: BP {v.get('bp_systolic')}/{v.get('bp_diastolic')}, HR {v.get('hr')}, Temp {v.get('temp')}°C",
            "user": v.get("recorded_by"),
            "data": _serialize_doc(v)
        })
    
    for n in notes:
        timeline.append({
            "type": "note",
            "time": n.get("session_date"),
            "display": f"Clinical Note added: {n.get('role_tag')}",
            "user": n.get("signed_by") or n.get("created_by"),
            "data": _serialize_doc(n)
        })
        
    for m in meds:
        timeline.append({
            "type": "medication",
            "time": m.get("created_at"),
            "display": f"Medication prescribed: {m.get('drug_name')} {m.get('dose')}",
            "user": m.get("prescribing_doctor_name"),
            "data": _serialize_doc(m)
        })
        
    for l in labs:
        timeline.append({
            "type": "lab",
            "time": l.get("created_at"),
            "display": f"Lab order/result: {l.get('test_name')}",
            "user": l.get("created_by"),
            "data": _serialize_doc(l)
        })
        
    for d in diagnosis:
        timeline.append({
            "type": "diagnosis",
            "time": d.get("created_at"),
            "display": f"Diagnosis updated: {d.get('primary_diagnosis')}",
            "user": d.get("created_by"),
            "data": _serialize_doc(d)
        })

    for h in history:
        timeline.append({
            "type": "history",
            "time": h.get("date") or h.get("created_at"),
            "display": h.get("description"),
            "user": h.get("created_by"),
            "data": _serialize_doc(h)
        })

    # Sort by time desc
    timeline.sort(key=lambda x: str(x["time"]), reverse=True)
    
    # Final serialization fix for times
    for item in timeline:
        t_val = item.get("time")
        if isinstance(t_val, datetime):
            item["time"] = t_val.isoformat()
            
    return timeline
