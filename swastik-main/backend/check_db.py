import asyncio
import os
import sys

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app.config.database import connect_to_mongo, get_db

async def check_db():
    await connect_to_mongo()
    db = get_db()
    
    doc = await db["lab_test_requests"].find_one()
    if doc:
        print(f"Keys: {list(doc.keys())}")
        print(f"Document: {doc}")
    else:
        print("No documents found in lab_test_requests")

if __name__ == "__main__":
    asyncio.run(check_db())
