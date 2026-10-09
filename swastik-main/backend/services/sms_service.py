"""
SMS service for Swastik Hospital using Fast2SMS API.

Uses the Fast2SMS bulkV2 endpoint to send SMS.
Reads API key from environment variable FAST2SMS_API_KEY.
Load environment variables using python-dotenv.
"""

import os
import requests
from dotenv import load_dotenv

# Load .env from backend root (when run from backend/) or current directory
load_dotenv()

# Fast2SMS bulkV2 API endpoint
FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


def send_sms(phone: str, message: str) -> dict:
    """
    Send SMS using Fast2SMS API.

    Args:
        phone: Recipient phone number (10-digit Indian number, e.g. 7559316330).
        message: SMS text to send.

    Returns:
        dict: API response from Fast2SMS. Contains keys like 'return', 'request_id', 'message'.
              On failure, returns {'success': False, 'error': str}.
    """
    # Read API key from environment variable
    authorization = os.getenv("FAST2SMS_API_KEY", "").strip().strip('"').strip("'")
    if not authorization:
        print("[SMS] Error: FAST2SMS_API_KEY not set in .env")
        return {"success": False, "error": "FAST2SMS_API_KEY not set"}

    # Headers: Fast2SMS bulkV2 expects Authorization in header
    headers = {
        "authorization": authorization,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
    }

    # Request body parameters as per Fast2SMS bulkV2 (authorization in header; rest in body)
    payload = {
        "message": message,
        "language": "english",
        "route": "q",
        "numbers": phone,
    }

    try:
        # Send POST request to Fast2SMS bulkV2
        response = requests.post(
            FAST2SMS_URL,
            json=payload,
            headers=headers,
            timeout=15,
        )
        # Parse and print response for debugging
        try:
            api_response = response.json()
        except Exception:
            api_response = {"_raw": response.text[:500]}

        print(f"[SMS] Fast2SMS response (status={response.status_code}): {api_response}")

        # Return the API response so caller can check success
        if response.status_code == 200:
            api_response["success"] = api_response.get("return") is True or bool(
                api_response.get("request_id")
            )
        else:
            api_response["success"] = False
            api_response["error"] = api_response.get("message", response.text)

        return api_response

    except requests.RequestException as e:
        print(f"[SMS] Request error: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        print(f"[SMS] Error: {e}")
        return {"success": False, "error": str(e)}
