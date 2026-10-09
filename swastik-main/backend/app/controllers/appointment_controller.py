from fastapi import HTTPException
from typing import Optional, List
from app.config.database import get_db
from app.schemas.registration import AppointmentCreate
from app.controllers import admin_controller, registration_controller, token_controller
from datetime import datetime
from bson import ObjectId
from app.utils.sms_utils import (
    send_appointment_confirmation, 
    send_appointment_scheduled,
    send_reschedule_notification, 
    send_unavailability_notification,
    send_cancellation_notification
)

async def create_appointment(data: AppointmentCreate):
    db = get_db()
    
    # Fetch patient info
    patient = await registration_controller.get_patient_by_uhid(data.uhid)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient UHID not found. Register patient first.")

    # Fetch doctor info
    doctor = await db["doctors"].find_one({"_id": ObjectId(data.doctor_id)}) if data.doctor_id else None
    doctor_name = doctor.get("name") if doctor else "Unknown Doctor"

    p_name = data.patient_name or patient.get("name")

    doc = {
        "uhid": data.uhid,
        "patient_name": p_name,
        "doctor_id": data.doctor_id,
        "doctor_name": doctor_name,
        "appointment_date": data.appointment_date,
        "appointment_time": data.appointment_time,
        "type": data.type,
        "notes": data.notes,
        "created_at": datetime.utcnow(),
        "status": "scheduled",
    }
    
    result = await db["appointments"].insert_one(doc)
    appointment_id = str(result.inserted_id)
    doc["_id"] = appointment_id

    # Generate Token for the appointment automatically ONLY if confirmed
    token_number = "T-N/A"
    if doc["status"] == "confirmed":
        try:
            token_doc = await token_controller.generate_token(
                patient_id=data.uhid,
                doctor_id=data.doctor_id,
                appointment_id=appointment_id,
                date_str=data.appointment_date
            )
            token_number = token_doc["token_number"]
            # Persist token_number in the appointment document
            await db["appointments"].update_one(
                {"_id": ObjectId(appointment_id)},
                {"$set": {"token_number": token_number}}
            )
            doc["token_number"] = token_number
        except Exception as e:
            print(f"Error generating token for appointment: {e}")

    # Trigger SMS Notification based on initial status
    try:
        if doc["status"] == "confirmed":
            await send_appointment_confirmation(
                patient_name=p_name,
                phone=patient.get("phone"),
                doctor_name=doctor_name,
                date=data.appointment_date,
                time=data.appointment_time,
                token_number=token_number
            )
        else:
            await send_appointment_scheduled(
                patient_name=p_name,
                phone=patient.get("phone"),
                doctor_name=doctor_name,
                date=data.appointment_date,
                time=data.appointment_time
            )
    except Exception as e:
        print(f"Error sending appointment SMS: {e}")

    # Log activity
    await admin_controller.log_activity("System/Admin", "Appointment", f"Booked appointment for {p_name} with {doctor_name}")

    return doc

async def list_appointments(uhid: Optional[str] = None, doctor_id: Optional[str] = None, skip: int = 0, limit: int = 100):
    db = get_db()
    q = {}
    if uhid:
        q["uhid"] = uhid
    if doctor_id:
        q["doctor_id"] = doctor_id
        
    cursor = db["appointments"].find(q).sort("appointment_date", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items

async def update_appointment_status(appointment_id: str, status: str, reschedule_date: Optional[str] = None, reschedule_time: Optional[str] = None, reason: Optional[str] = None):
    db = get_db()
    update_data = {"status": status}
    if reschedule_date:
        update_data["appointment_date"] = reschedule_date
    if reschedule_time:
        update_data["appointment_time"] = reschedule_time
    if reason:
        update_data["notes"] = reason

    result = await db["appointments"].find_one_and_update(
        {"_id": ObjectId(appointment_id)},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Appointment not found")

    result["_id"] = str(result["_id"])
    
    # Generate token if confirmed or attended and doesn't have one
    if (status == "confirmed" or status == "attended") and not result.get("token_number"):
        try:
            token_doc = await token_controller.generate_token(
                patient_id=result["uhid"],
                doctor_id=result["doctor_id"],
                appointment_id=appointment_id,
                date_str=result["appointment_date"]
            )
            token_number = token_doc["token_number"]
            await db["appointments"].update_one(
                {"_id": ObjectId(appointment_id)},
                {"$set": {"token_number": token_number}}
            )
            result["token_number"] = token_number
        except Exception as e:
            print(f"Error generating token for update: {e}")
    
    # Send SMS notification based on status
    patient = await registration_controller.get_patient_by_uhid(result["uhid"])
    if patient:
        phone = patient.get("phone")
        patient_name = patient.get("name")
        doctor_name = result.get("doctor_name", "the doctor")
        print(f"DEBUG: Triggering SMS for status {status}. Patient: {patient_name}, Phone: {phone}")
        
        if status == "rescheduled":
            print(f"DEBUG: Rescheduling for {appointment_id}. New Date: {result['appointment_date']}, New Time: {result['appointment_time']}")
            # Generate a new token for the new date
            new_token_number = "T-N/A"
            try:
                # Generate new token
                token_doc = await token_controller.generate_token(
                    patient_id=result["uhid"],
                    doctor_id=result["doctor_id"],
                    appointment_id=appointment_id,
                    date_str=result["appointment_date"]
                )
                new_token_number = token_doc["token_number"]
                # Update token in appointment document
                await db["appointments"].update_one(
                    {"_id": ObjectId(appointment_id)},
                    {"$set": {"token_number": new_token_number}}
                )
            except Exception as e:
                print(f"Error generating new token for rescheduling: {e}")

            await send_reschedule_notification(
                patient_name=patient_name, 
                phone=phone, 
                doctor_name=doctor_name,
                date=result["appointment_date"], 
                time=result["appointment_time"],
                token_number=new_token_number
            )
        elif status == "cancelled":
            print(f"DEBUG: Cancellation for {appointment_id}. Reason: {reason}")
            if reason and "not available" in reason.lower():
                await send_unavailability_notification(patient_name, phone, doctor_name)
            else:
                await send_cancellation_notification(
                    patient_name=patient_name,
                    phone=phone,
                    doctor_name=doctor_name,
                    date=result["appointment_date"],
                    time=result["appointment_time"],
                    reason=reason
                )
                print(f"DEBUG: Cancellation notification sent to {phone}")
        elif status == "confirmed":
            await send_appointment_confirmation(
                patient_name=patient_name,
                phone=phone,
                doctor_name=doctor_name,
                date=result["appointment_date"],
                time=result["appointment_time"],
                token_number=result.get("token_number", "T-N/A")
            )
            print(f"DEBUG: Confirmation notification sent to {phone}")

    return result

async def get_booked_slots(doctor_id: str, date: str):
    db = get_db()
    cursor = db["appointments"].find({
        "doctor_id": doctor_id,
        "appointment_date": date,
        "status": {"$ne": "cancelled"}
    }, {"appointment_time": 1})
    slots = []
    async for doc in cursor:
        if doc.get("appointment_time"):
            slots.append(doc["appointment_time"])
    return slots

async def block_appointment_slot(doctor_id: str, date: str, time: str, reason: str = "Doctor Unavailable"):
    db = get_db()
    
    # Check if doctor exists
    try:
        doctor = await db["doctors"].find_one({"_id": ObjectId(doctor_id)})
    except:
        doctor = None
        
    if not doctor:
        doctor = await db["doctors"].find_one({"name": doctor_id})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
            
    block_doc = {
        "uhid": "BLOCKED",
        "doctor_id": doctor_id,
        "doctor_name": doctor["name"],
        "appointment_date": date,
        "appointment_time": time,
        "status": "blocked",
        "reason": reason,
        "created_at": datetime.utcnow(),
    }
    
    await db["appointments"].insert_one(block_doc)
    
    # Notify patients and update their appointments
    cursor = db["appointments"].find({
        "doctor_id": doctor_id,
        "appointment_date": date,
        "appointment_time": time,
        "status": {"$in": ["scheduled", "confirmed", "pending"]}
    })
    affected_appointments = await cursor.to_list(length=100)
    
    for app in affected_appointments:
        # Create in-app notification
        await registration_controller.create_notification(
            recipient_role=f"patient:{app['uhid']}",
            title="Appointment Update",
            message=f"Your appointment with {doctor['name']} on {date} at {time} needs rescheduling. Reason: {reason}",
            type="medical"
        )
        
        patient = await registration_controller.get_patient_by_uhid(app["uhid"])
        if patient and patient.get("phone"):
            try:
                await send_unavailability_notification(
                    patient_name=patient.get("name"),
                    phone=patient.get("phone"),
                    doctor_name=doctor["name"]
                )
            except Exception as e:
                print(f"Error sending unavailability SMS: {e}")

        await db["appointments"].update_one(
            {"_id": app["_id"]},
            {"$set": {"status": "needs_reschedule", "cancellation_reason": reason}}
        )

    # Notify receptionist
    await registration_controller.create_notification(
        recipient_role="receptionist",
        title="Doctor Unavailable",
        message=f"Slot {time} on {date} blocked for {doctor['name']}. {len(affected_appointments)} patients notified.",
        type="alert"
    )

    return {"message": f"Slot {time} on {date} blocked. {len(affected_appointments)} patients notified."}
