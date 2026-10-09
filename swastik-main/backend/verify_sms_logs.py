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

async def check_sms_logs():
    client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
    db = client[DB_NAME]
    logs = await db['sms_logs'].find().sort("sent_at", -1).limit(5).to_list(length=5)
    for log in logs:
        print(f"Type: {log['type']}, Phone: {log['phone']}, Message snippet: {log['message'][:100]}")
    client.close()

if __name__ == "__main__":
    asyncio.run(check_sms_logs())
