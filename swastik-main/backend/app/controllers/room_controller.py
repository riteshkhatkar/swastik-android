from app.config.database import get_db
from app.schemas.room import RoomCreate, RoomUpdate
from bson import ObjectId
from datetime import datetime
from fastapi import HTTPException

ROOMS_COLLECTION = "rooms"

async def create_room(data: RoomCreate):
    db = get_db()
    doc = data.dict()
    doc["created_at"] = datetime.utcnow()
    result = await db[ROOMS_COLLECTION].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

async def get_rooms(room_type: str = None, status: str = None):
    db = get_db()
    query = {}
    if room_type:
        query["room_type"] = room_type
    if status:
        query["status"] = status
    
    # Auto-seed if empty
    count = await db[ROOMS_COLLECTION].count_documents({})
    if count == 0:
        await seed_rooms()
        
    cursor = db[ROOMS_COLLECTION].find(query)
    rooms = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        rooms.append(doc)
    return rooms

async def get_room_by_id(room_id: str):
    db = get_db()
    try:
        obj_id = ObjectId(room_id)
    except Exception as e:
        with open("admission_debug.log", "a") as f:
            f.write(f"{datetime.utcnow()} - ERROR: Invalid room_id format: '{room_id}' - {str(e)}\n")
        return None
        
    doc = await db[ROOMS_COLLECTION].find_one({"_id": obj_id})
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    return doc

async def update_room_status(room_id: str, status: str):
    db = get_db()
    result = await db[ROOMS_COLLECTION].update_one(
        {"_id": ObjectId(room_id)},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room status updated"}

async def seed_rooms():
    db = get_db()
    rooms_to_seed = []
    
    # General Ward: 8 rooms (G-101 to G-108), 5 beds each = 40 beds (₹1,500/day)
    for i in range(1, 9):
        rooms_to_seed.append({
            "room_number": f"G-{100 + i}",
            "room_type": "General",
            "bed_count": 5,
            "status": "Available",
            "price_per_day": 1500
        })
        
    # Private Ward: 40 rooms (P-201 to P-240), 1 bed each = 40 beds (₹4,500/day)
    for i in range(1, 41):
        rooms_to_seed.append({
            "room_number": f"P-{200 + i}",
            "room_type": "Private",
            "bed_count": 1,
            "status": "Available",
            "price_per_day": 4500
        })
        
    # ICU Ward: ICU-301 to ICU-340, 1 bed each = 40 beds (₹8,500/day)
    for i in range(1, 41):
        rooms_to_seed.append({
            "room_number": f"ICU-{300 + i}",
            "room_type": "ICU",
            "bed_count": 1,
            "status": "Available",
            "price_per_day": 8500
        })
        
    for room in rooms_to_seed:
        await db[ROOMS_COLLECTION].update_one(
            {"room_number": room["room_number"]},
            {"$set": room},
            upsert=True
        )
    print(f"Seeded {len(rooms_to_seed)} rooms across General, Private, and ICU wards.")
