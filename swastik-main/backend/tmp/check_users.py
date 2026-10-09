import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config.database import connect_to_mongo, get_db

async def check():
    print("--- Listing All Users in Database ---")
    await connect_to_mongo()
    db = get_db()
    
    users = await db["users"].find().to_list(None)
    print(f"Total users found: {len(users)}")
    
    for user in users:
        print(f"- Username: {user['username']}, Role: {user.get('role', 'user')}")

if __name__ == "__main__":
    asyncio.run(check())
