import os
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

# Set up logging for SMS
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SMS_SERVICE")

TEXTBEE_API_KEY = os.getenv("TEXTBEE_API_KEY")
TEXTBEE_DEVICE_ID = os.getenv("TEXTBEE_DEVICE_ID")
SMS_ENABLED = os.getenv("SMS_ENABLED", "false").lower() == "true"

async def send_sms(phone: str, message: str):
    """
    Sends an SMS using TextBee API.
    """
    if not SMS_ENABLED:
        logger.info(f"SMS Sending is disabled. Skip sending to {phone}")
        return {"status": "skipped", "message": "SMS_ENABLED is false"}

    if not TEXTBEE_API_KEY or TEXTBEE_API_KEY == "your_api_key_here":
        logger.warning("TEXTBEE_API_KEY not set or invalid. Skipping SMS.")
        return {"status": "failed", "message": "API Key missing"}

    if not TEXTBEE_DEVICE_ID or TEXTBEE_DEVICE_ID == "your_device_id_here":
        logger.warning("TEXTBEE_DEVICE_ID not set or invalid. Skipping SMS.")
        return {"status": "failed", "message": "Device ID missing"}

    # Normalize phone number (strip +91 or other non-digit chars, keep last 10 digits)
    normalized_phone: str = "".join(filter(str.isdigit, phone))
    import re
    phone_match = re.search(r"(\d{10})$", normalized_phone)
    if phone_match:
        normalized_phone = phone_match.group(1)
    
    if len(normalized_phone) != 10:
        logger.error(f"Invalid phone number format: {phone}")
        return {"status": "failed", "message": "Invalid phone number"}

    # TextBee API Endpoint
    url = f"https://api.textbee.dev/api/v1/gateway/devices/{TEXTBEE_DEVICE_ID}/send-sms"

    # TextBee headers (x-api-key)
    headers = {
        "x-api-key": TEXTBEE_API_KEY,
        "Content-Type": "application/json"
    }

    # TextBee payload
    payload = {
        "recipients": [f"+91{normalized_phone}"],
        "message": message
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            print(f"DEBUG: TextBee Response Status: {response.status_code}")
            response_data = response.json()
            print(f"DEBUG: TextBee Response Body: {response_data}")

            if response.status_code == 200 or response.status_code == 201:
                logger.info(f"SMS sent successfully via TextBee to {normalized_phone}. Status: {response.status_code}")
                return {"status": "success", "response": response_data}
            else:
                logger.error(f"SMS sending failed via TextBee for {normalized_phone}. Status: {response.status_code}, Response: {response_data}")
                return {"status": "failed", "response": response_data}

    except Exception as e:
        logger.error(f"Exception while sending SMS via TextBee to {phone}: {str(e)}")
        return {"status": "error", "message": str(e)}

async def send_appointment_sms(patient_name: str, doctor_name: str, date: str, time: str, phone: str, token_number: str = "T-N/A"):
    """
    Formats and sends appointment booking confirmation SMS.
    """
    message = (
        f"Dear {patient_name},\n\n"
        f"Your appointment with Dr. {doctor_name} has been successfully booked.\n\n"
        f"Date: {date}\n"
        f"Time: {time}\n"
        f"Token: {token_number}\n"
        f"Hospital: Swastik Hospital\n\n"
        f"Thank you."
    )
    
    return await send_sms(phone, message)

