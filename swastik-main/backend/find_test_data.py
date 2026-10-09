import os
import certifi
import json
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://swastikAdmin:Admin%40123@swastikdata.nmey2l2.mongodb.net/?retryWrites=true&w=majority&appName=Swastikdata",
)
DB_NAME = os.getenv("DB_NAME", "Swastik_Hospital")

async def find_data():
    client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
    db = client[DB_NAME]
    p = await db['patients'].find_one()
    d = await db['doctors'].find_one()
    data = {
        "p_uhid": p['uhid'] if p else None,
        "d_id": str(d['_id']) if d else None
    }
    with open('test_data.json', 'w') as f:
        json.dump(data, f)
    print("Data saved to test_data.json")
    client.close()

if __name__ == "__main__":
    asyncio.run(find_data())
