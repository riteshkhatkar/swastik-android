import asyncio
from app.config.database import connect_to_mongo
from app.controllers.registration_controller import seed_beds

async def main():
    await connect_to_mongo()
    print("Seed process starting...")
    await seed_beds()
    print("Seed process completed.")

if __name__ == "__main__":
    asyncio.run(main())
