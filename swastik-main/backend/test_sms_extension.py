import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000"

async def test_sms_extension():
    async with httpx.AsyncClient() as client:
        # 1. Book an appointment
        print("Booking appointment...")
        appointment_data = {
            "uhid": "SWASTIK-2026-00006",
            "doctor_id": "69a52a79f8cc4dce4f82a34f",
            "appointment_date": "2026-03-12",
            "appointment_time": "10:30 AM",
            "type": "New"
        }
        res = await client.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        if res.status_code == 200:
            apt = res.json()
            appointment_id = apt["_id"]
            print(f"Appointment booked: {appointment_id}")
        else:
            print(f"Failed to book: {res.text}")
            return

        # 2. Reschedule
        print("\nRescheduling appointment...")
        res = await client.put(f"{BASE_URL}/api/appointments/reschedule/{appointment_id}", json={
            "reschedule_date": "2026-03-14",
            "reschedule_time": "11:00 AM",
            "reason": "Patient request"
        })
        if res.status_code == 200:
            print("Rescheduled successfully")
        else:
            print(f"Failed to reschedule: {res.text}")

        # 3. Cancel
        print("\nCancelling appointment...")
        res = await client.put(f"{BASE_URL}/api/appointments/cancel/{appointment_id}")
        if res.status_code == 200:
            print("Cancelled successfully")
        else:
            print(f"Failed to cancel: {res.text}")

if __name__ == "__main__":
    asyncio.run(test_sms_extension())
