import asyncio
from app.config.database import connect_to_mongo
from app.controllers.room_controller import seed_rooms

async def main():
    await connect_to_mongo()
    print("Room seed process starting...")
    await seed_rooms()
    print("Room seed process completed.")

if __name__ == "__main__":
    asyncio.run(main())
