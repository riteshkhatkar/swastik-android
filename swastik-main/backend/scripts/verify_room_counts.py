import asyncio
from app.config.database import get_db, connect_to_mongo

async def verify_rooms():
    await connect_to_mongo()
    db = get_db()
    
    room_types = ["General", "Private", "ICU"]
    for rt in room_types:
        count = await db["rooms"].count_documents({"room_type": rt})
        print(f"Room Type: {rt}, Count: {count}")
    
    total = await db["rooms"].count_documents({})
    print(f"Total Rooms: {total}")

if __name__ == "__main__":
    asyncio.run(verify_rooms())
