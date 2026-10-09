import httpx
import asyncio
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def verify_fixes():
    async with httpx.AsyncClient() as client:
        # Problem 1: Token Persistence & Booking SMS
        print("--- Testing Problem 1: Booking & Token Persistence ---")
        appointment_data = {
            "uhid": "SWASTIK-2026-00006",
            "doctor_id": "69a52a79f8cc4dce4f82a34f",
            "appointment_date": "2026-03-15",
            "appointment_time": "10:00 AM",
            "type": "New",
            "patient_name": "Test Patient"
        }
        res = await client.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        if res.status_code == 200:
            apt = res.json()
            appointment_id = apt["_id"]
            token_in_resp = apt.get("token_number")
            print(f"Appointment booked. ID: {appointment_id}, Token in response: {token_in_resp}")
            
            # Verify persistence in DB via list
            res_list = await client.get(f"{BASE_URL}/api/appointments?uhid=SWASTIK-2026-00006")
            if res_list.status_code == 200:
                apts = res_list.json()
                found = next((a for a in apts if a["_id"] == appointment_id), None)
                if found and found.get("token_number"):
                    print(f"Token persistence verified: {found['token_number']}")
                else:
                    print("Token NOT found in persisted appointment data!")
        else:
            print(f"Booking failed: {res.text}")
            return

        # Problem 2: Rescheduling & New Token
        print("\n--- Testing Problem 2: Rescheduling & New Token ---")
        res = await client.put(f"{BASE_URL}/api/appointments/reschedule/{appointment_id}", json={
            "date": "2026-03-16",
            "time": "11:00 AM"
        })
        if res.status_code == 200:
            res_list = await client.get(f"{BASE_URL}/api/appointments?uhid=SWASTIK-2026-00006")
            apts = res_list.json()
            updated = next((a for a in apts if a["_id"] == appointment_id), None)
            print(f"Rescheduled. New Token stored: {updated.get('token_number')}")
        else:
            print(f"Rescheduling failed: {res.text}")

        # Problem 2: Cancellation & Reason
        print("\n--- Testing Problem 2: Cancellation & Reason ---")
        reason = "Patient had an emergency"
        res = await client.put(f"{BASE_URL}/api/appointments/cancel/{appointment_id}?reason={reason}")
        if res.status_code == 200:
            print(f"Cancelled with reason: {reason}")
            # Check logs via helper if possible, or just assume success if 200
        else:
            print(f"Cancellation failed: {res.text}")

        # Problem 3: Fast2SMS Removal
        print("\n--- Testing Problem 3: Fast2SMS Removal ---")
        res = await client.get(f"{BASE_URL}/api/test-sms")
        if res.status_code == 404:
            print("Verified: /api/test-sms no longer exists (404).")
        else:
            print(f"Error: /api/test-sms still exists! Status: {res.status_code}")

if __name__ == "__main__":
    asyncio.run(verify_fixes())
