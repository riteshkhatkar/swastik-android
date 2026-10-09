import asyncio
from app.config.database import get_db, connect_to_mongo

async def check_beds():
    await connect_to_mongo()
    db = get_db()
    
    wards = ["General", "Private", "ICU"]
    for ward in wards:
        count = await db["beds"].count_documents({"ward_type": ward})
        print(f"Ward: {ward}, Count: {count}")
    
    total = await db["beds"].count_documents({})
    print(f"Total Beds: {total}")

if __name__ == "__main__":
    asyncio.run(check_beds())
