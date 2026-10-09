"""
SMS utilities for Swastik Hospital.
- Appointment confirmation with branding and patient portal dashboard link.
- Uses centralized TextBee service for delivery.
"""
import os
import re
import logging
from datetime import datetime
from dotenv import load_dotenv
from app.config.database import get_db
from app.controllers import admin_controller
from app.services import sms_service

load_dotenv()

# Set up logging for SMS
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SMS_UTILS")

# Config from environment
PORTAL_BASE_URL = os.getenv("PORTAL_BASE_URL", "http://localhost:3000").rstrip("/")
HOSPITAL_CONTACT = os.getenv("HOSPITAL_CONTACT", "7559316330")


def normalize_phone(phone: str) -> str:
    """Extract 10-digit Indian mobile number. Returns empty string if invalid."""
    if not phone:
        return ""
    digits: str = re.sub(r"\D", "", str(phone))
    if len(digits) == 10 and digits.startswith(("6", "7", "8", "9")):
        return digits
    if len(digits) == 12 and digits.startswith("91"):
        return re.sub(r"^91", "", digits)
    if len(digits) == 11 and digits.startswith("0"):
        return re.sub(r"^0", "", digits)
    
    match = re.search(r"(\d{10})$", digits)
    normalized: str = match.group(1) if match else ""
    print(f"DEBUG: normalize_phone('{phone}') -> '{normalized}'")
    return normalized


def get_portal_dashboard_url() -> str:
    """URL for patient portal dashboard (used in SMS link)."""
    return f"{PORTAL_BASE_URL}/patient-portal/dashboard"


def build_appointment_confirmation_message(
    patient_name: str,
    doctor_name: str,
    date: str,
    time: str,
    token_number: str = "T-N/A"
) -> str:
    """Standard branded SMS for appointment confirmation."""
    name = (patient_name or "Patient").strip() or "Patient"
    doctor = (doctor_name or "Doctor").strip() or "Doctor"
    contact = HOSPITAL_CONTACT or "7559316330"
    message = (
        f"Swastik Hospital:\n"
        f"Your appointment is confirmed.\n\n"
        f"Doctor: {doctor}\n"
        f"Date: {date}\n"
        f"Time: {time}\n"
        f"Token: {token_number}\n\n"
        f"Please arrive 10 minutes early. Contact: {contact}."
    )
    return message


def build_appointment_scheduled_message(
    patient_name: str,
    doctor_name: str,
    date: str,
    time: str
) -> str:
    """Branded SMS for appointment scheduling."""
    name = (patient_name or "Patient").strip() or "Patient"
    doctor = (doctor_name or "Doctor").strip() or "Doctor"
    contact = HOSPITAL_CONTACT or "7559316330"
    message = (
        f"Swastik Hospital:\n"
        f"You have scheduled an appointment.\n\n"
        f"Doctor: {doctor}\n"
        f"Date: {date}\n"
        f"Time: {time}\n\n"
        f"Confirmation will be sent soon. Contact: {contact}."
    )
    return message


async def send_sms(phone: str, message: str, type: str = "General"):
    """
    Sends SMS using the centralized SMS service and logs results in DB.
    """
    normalized: str = normalize_phone(phone)
    if not normalized:
        logger.warning(f"SMS skipped - invalid phone: {phone}")
        return False

    message_preview: str = re.sub(r"^(.{1,40}).*$", r"\1", str(message).replace("\n", " "), flags=re.DOTALL)
    logger.info(f"Triggering SMS via service to {normalized} ({type}): {message_preview}...")
    
    # Call the actual service (TextBee)
    result = await sms_service.send_sms(normalized, message)
    print(f"DEBUG: sms_service.send_sms result for {normalized}: {result}")
    
    # Log the SMS activity in the database
    try:
        db = get_db()
        sms_log = {
            "phone": normalized,
            "message": message,
            "type": type,
            "sent_at": datetime.utcnow(),
            "status": result.get("status", "error") if isinstance(result, dict) else "sent",
            "backend_response": result.get("response") if isinstance(result, dict) else str(result)
        }
        await db["sms_logs"].insert_one(sms_log)
        
        # Log as general activity
        status = result.get("status") if isinstance(result, dict) else "unknown"
        await admin_controller.log_activity(
            "System/SMS", 
            "Notification", 
            f"SMS {status} to {normalized} ({type})"
        )
        
    except Exception as e:
        logger.error(f"Error logging SMS: {e}")
    
    if isinstance(result, dict):
        return result.get("status") == "success"
    return bool(result)


async def send_appointment_confirmation(patient_name: str, phone: str, doctor_name: str, date: str, time: str, token_number: str = "T-N/A"):
    """
    Send branded appointment confirmation SMS.
    """
    message = build_appointment_confirmation_message(
        patient_name=patient_name,
        doctor_name=doctor_name,
        date=date,
        time=time,
        token_number=token_number
    )
    return await send_sms(phone, message, "Appointment Confirmation")


async def send_appointment_scheduled(patient_name: str, phone: str, doctor_name: str, date: str, time: str):
    """
    Send branded appointment scheduled SMS.
    """
    message = build_appointment_scheduled_message(
        patient_name=patient_name,
        doctor_name=doctor_name,
        date=date,
        time=time
    )
    return await send_sms(phone, message, "Appointment Scheduled")


async def send_unavailability_notification(patient_name: str, phone: str, doctor_name: str):
    message = (
        f"Swastik Hospital: Dear {patient_name or 'Patient'}, "
        f"{doctor_name or 'Doctor'} is not available. "
        f"Please contact us to reschedule. Call {HOSPITAL_CONTACT}. - Swastik Hospital"
    )
    return await send_sms(phone, message, "Doctor Unavailability")


async def send_reschedule_notification(patient_name: str, phone: str, doctor_name: str, date: str, time: str, token_number: str = "T-N/A"):
    contact = HOSPITAL_CONTACT or "7559316330"
    message = (
        f"Swastik Hospital:\n\n"
        f"Your appointment has been rescheduled.\n\n"
        f"Doctor: {doctor_name}\n"
        f"New Date: {date}\n"
        f"New Time: {time}\n"
        f"Token: {token_number}\n\n"
        f"Thank you. Contact: {contact}"
    )
    return await send_sms(phone, message, "Reschedule Notification")


async def send_cancellation_notification(patient_name: str, phone: str, doctor_name: str, date: str, time: str, reason: str | None = None):
    contact = HOSPITAL_CONTACT or "7559316330"
    reason_str = f"\nReason: {reason}" if reason else ""
    message = (
        f"Swastik Hospital:\n\n"
        f"Your appointment scheduled on {date} at {time} with {doctor_name} has been cancelled.{reason_str}\n\n"
        f"For assistance please contact the hospital: {contact}"
    )
    return await send_sms(phone, message, "Cancellation Notification")


def build_registration_confirmation_message(patient_name: str, uhid: str, password: str = None) -> str:
    """Standard branded SMS for successful patient registration."""
    contact = HOSPITAL_CONTACT or "7559316330"
    portal_url = PORTAL_BASE_URL or "http://localhost:3000"
    pass_info = f"\nPassword: {password}" if password else ""
    message = (
        f"Swastik Hospital:\n"
        f"Registration successful!\n\n"
        f"Patient: {patient_name}\n"
        f"UHID: {uhid}{pass_info}\n"
        f"Portal: {portal_url}\n\n"
        f"Use your UHID to login. Contact: {contact}."
    )
    return message


async def send_registration_confirmation(patient_name: str, phone: str, uhid: str, password: str = None):
    """
    Send branded registration confirmation SMS.
    """
    message = build_registration_confirmation_message(
        patient_name=patient_name,
        uhid=uhid,
        password=password
    )
    return await send_sms(phone, message, "Registration Confirmation")
