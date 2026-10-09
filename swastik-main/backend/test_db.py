import asyncio
import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://swastikAdmin:Admin%40123@swastikdata.nmey2l2.mongodb.net/?retryWrites=true&w=majority&appName=Swastikdata",
)
DB_NAME = os.getenv("DB_NAME", "swastik_hospital")

async def test_db():
    print(f"Connecting to {DB_NAME}...")
    client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
    db = client[DB_NAME]
    try:
        await client.admin.command("ping")
        print("Connected!")
        collections = await db.list_collection_names()
        print(f"Collections: {collections}")
        
        print("Testing write to 'test_write' collection...")
        await db["test_write"].insert_one({"test": "data", "at": "now"})
        print("Write successful!")
        await db["test_write"].delete_many({"test": "data"})
        print("Delete successful!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_db())
