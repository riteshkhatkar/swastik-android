import httpx
import asyncio
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_tokens():
    async with httpx.AsyncClient() as client:
        # 1. Fetch doctors to get an ID
        print("Fetching doctors...")
        res = await client.get(f"{BASE_URL}/api/appointments") # Fetching appointments to get context, but let's just get doctors
        # Actually register_routes has get_doctors
        # Let's hope some doctors exist.
        
        # Mocking data for test
        patient_uhid = "P12345" # Using a dummy UHID
        doctor_id = "65ebf0a8c2f1a23456789012" # Dummy MongoID
        
        print("\nAttempting to generate tokens...")
        for i in range(3):
            data = {
                "patient_id": patient_uhid,
                "doctor_id": doctor_id
            }
            res = await client.post(f"{BASE_URL}/api/tokens/generate", json=data)
            if res.status_code == 200:
                print(f"Generated Token {i+1}: {res.json()['token_number']}")
            else:
                print(f"Failed to generate token {i+1}: {res.text}")

        # 2. Fetch Doctor Queue
        print(f"\nFetching queue for doctor {doctor_id}...")
        res = await client.get(f"{BASE_URL}/api/tokens/doctor/{doctor_id}")
        if res.status_code == 200:
            queue = res.json()
            print(f"Queue Length: {len(queue)}")
            for t in queue:
                print(f" - {t['token_number']}: {t['status']}")
        else:
            print(f"Failed to fetch queue: {res.text}")

        # 3. Update Token Status
        if len(queue) > 0:
            token_id = queue[0]["_id"]
            print(f"\nUpdating token {token_id} to in_consultation...")
            res = await client.put(f"{BASE_URL}/api/tokens/update/{token_id}", json={"status": "in_consultation"})
            if res.status_code == 200:
                print("Status updated successfully!")
            else:
                print(f"Failed to update status: {res.text}")

if __name__ == "__main__":
    try:
        asyncio.run(test_tokens())
    except Exception as e:
        print(f"Error during testing: {e}")
