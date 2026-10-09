
import asyncio
from app.config.database import get_db, connect_to_mongo, close_mongo
from bson import ObjectId

async def check_rooms():
    await connect_to_mongo()
    db = get_db()
    rooms = await db["rooms"].find().to_list(length=100)
    print("ROOMS MISSING room_number:")
    incomplete = await db["rooms"].find({"room_number": {"$exists": False}}).to_list(length=100)
    for r in incomplete:
        print(r)
    
    print("\nALL ROOMS (Full Doc):")
    rooms = await db["rooms"].find().to_list(length=100)
    for r in rooms:
        print(r)
    await close_mongo()

if __name__ == "__main__":
    asyncio.run(check_rooms())
