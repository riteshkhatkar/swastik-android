import asyncio
from app.config.database import get_db, connect_to_mongo

async def list_all_beds():
    await connect_to_mongo()
    db = get_db()
    
    # Get distinct ward types
    ward_types = await db["beds"].distinct("ward_type")
    print(f"Ward Types found: {ward_types}")
    
    for wt in ward_types:
        count = await db["beds"].count_documents({"ward_type": wt})
        print(f"Ward: {wt}, Count: {count}")

if __name__ == "__main__":
    asyncio.run(list_all_beds())
