import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000"

async def test_appointment_actions():
    async with httpx.AsyncClient() as client:
        # 1. List appointments to get an ID
        print("Fetching appointments...")
        res = await client.get(f"{BASE_URL}/api/appointments")
        if res.status_code != 200:
            print(f"Failed to fetch appointments: {res.text}")
            return
        
        appointments = res.json()
        if not appointments:
            print("No appointments found to test with.")
            # Let's try to create one if none exist? 
            # For now assume some exist in developer DB
            return
        
        target = appointments[0]
        app_id = target["_id"]
        print(f"Testing with Appointment ID: {app_id}")

        # 2. Test Cancel
        print("\nTesting Cancel Appointment...")
        res = await client.put(f"{BASE_URL}/api/appointments/cancel/{app_id}?reason=Test+Cancellation")
        if res.status_code == 200:
            print("SUCCESS: Appointment cancelled!")
            print(json.dumps(res.json(), indent=2))
        else:
            print(f"FAILED: Cancel failed with {res.status_code}: {res.text}")

        # 3. Test Reschedule
        print("\nTesting Reschedule Appointment...")
        data = {
            "date": "2026-04-10",
            "time": "10:30 AM"
        }
        res = await client.put(f"{BASE_URL}/api/appointments/reschedule/{app_id}", json=data)
        if res.status_code == 200:
            print("SUCCESS: Appointment rescheduled!")
            print(json.dumps(res.json(), indent=2))
        else:
            print(f"FAILED: Reschedule failed with {res.status_code}: {res.text}")

if __name__ == "__main__":
    try:
        asyncio.run(test_appointment_actions())
    except Exception as e:
        print(f"Error during testing: {e}")
