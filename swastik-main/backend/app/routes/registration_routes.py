from fastapi import APIRouter, Query, HTTPException
from app.schemas.registration import (
    PatientRegistrationCreate,
    OPDRegistrationCreate,
    IPDRegistrationCreate,
    DoctorRegistrationCreate,
    StaffRegistrationCreate,
    AppointmentCreate,
)
from app.controllers import registration_controller, appointment_controller

router = APIRouter(tags=["registration"])


@router.post("/patients")
async def register_patient(data: PatientRegistrationCreate):
    return await registration_controller.create_patient(data)


@router.post("/patients/register")
async def register_patient_alias(data: PatientRegistrationCreate):
    return await registration_controller.create_patient(data)


@router.get("/patients")
async def list_patients(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500)):
    return await registration_controller.list_patients(skip=skip, limit=limit)


@router.get("/patients/{uhid}")
async def get_patient(uhid: str):
    patient = await registration_controller.get_patient_by_uhid(uhid)
    if not patient:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/opd")
async def register_opd(data: OPDRegistrationCreate):
    return await registration_controller.create_opd_registration(data)


@router.get("/opd")
async def list_opd(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500)):
    return await registration_controller.list_opd(skip=skip, limit=limit)


@router.post("/ipd")
async def register_ipd(data: IPDRegistrationCreate):
    return await registration_controller.create_ipd_registration(data)


@router.get("/ipd")
async def list_ipd(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500)):
    return await registration_controller.list_ipd(skip=skip, limit=limit)




@router.post("/doctors")
async def register_doctor(data: DoctorRegistrationCreate):
    return await registration_controller.create_doctor(data)


@router.get("/doctors")
async def list_doctors():
    from app.config.database import get_db
    db = get_db()
    cursor = db["doctors"].find()
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items


@router.post("/staff")
async def register_staff(data: StaffRegistrationCreate):
    return await registration_controller.create_staff(data)


@router.post("/appointments")
async def create_appointment(data: AppointmentCreate):
    return await appointment_controller.create_appointment(data)


@router.get("/appointments")
async def list_appointments(
    uhid: str | None = Query(None),
    doctor_id: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await appointment_controller.list_appointments(uhid=uhid, doctor_id=doctor_id, skip=skip, limit=limit)


@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    status: str = Query(...),
    date: str | None = Query(None),
    time: str | None = Query(None),
    reason: str | None = Query(None)
):
    return await appointment_controller.update_appointment_status(
        appointment_id=appointment_id,
        status=status,
        reschedule_date=date,
        reschedule_time=time,
        reason=reason
    )


@router.put("/appointments/cancel/{appointment_id}")
async def cancel_appointment(appointment_id: str, reason: str | None = Query(None)):
    return await appointment_controller.update_appointment_status(
        appointment_id=appointment_id,
        status="cancelled",
        reason=reason
    )


@router.put("/appointments/reschedule/{appointment_id}")
async def reschedule_appointment(appointment_id: str, data: dict):
    # data is expected to have "date" and "time"
    return await appointment_controller.update_appointment_status(
        appointment_id=appointment_id,
        status="rescheduled",
        reschedule_date=data.get("date"),
        reschedule_time=data.get("time")
    )


@router.get("/appointments/booked-slots")
async def get_booked_slots(doctor_id: str = Query(...), date: str = Query(...)):
    return await appointment_controller.get_booked_slots(doctor_id, date)


@router.get("/dashboard/counts")
async def dashboard_counts():
    return await registration_controller.get_dashboard_counts()


@router.get("/patients/stats/counts")
async def patient_stats_counts():
    return await registration_controller.get_dashboard_counts()


@router.get("/beds")
async def list_beds(ward_type: str | None = None, status: str | None = None):
    return await registration_controller.get_beds(ward_type=ward_type, status=status)


@router.post("/appointments/block-slot")
async def block_appointment_slot(doctor_id: str = Query(...), date: str = Query(...), time: str = Query(...), reason: str = "Doctor Unavailable"):
    return await appointment_controller.block_appointment_slot(doctor_id, date, time, reason)


@router.post("/patients/bulk-import")
async def bulk_import_patients(patients_data: list):
    return await registration_controller.bulk_import_patients(patients_data)


@router.get("/notifications")
async def get_notifications(role: str = Query(...)):
    return await registration_controller.get_notifications(role)


@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str):
    return await registration_controller.mark_notification_read(notif_id)
