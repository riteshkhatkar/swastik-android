"""MongoDB connection using Motor (async)."""
import os
import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure

from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent.parent
_env_file = _backend_dir / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file)
else:
    load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://adminOrelse:orelse12@127.0.0.1:27017/")
DB_NAME = os.getenv("DB_NAME", "Swastik_Hospital")

client = None
db = None

# Use public DNS for SRV resolution when local DNS refuses (e.g. router at 192.168.1.1)
def _use_public_dns_for_srv():
    try:
        import dns.resolver
        resolver = dns.resolver.Resolver(configure=False)
        resolver.nameservers = ["8.8.8.8", "8.8.4.4"]
        dns.resolver.default_resolver = resolver
    except Exception:
        pass


async def connect_to_mongo():
    global client, db
    # Prefer public DNS for mongodb+srv so SRV lookups work when local DNS refuses
    if "mongodb+srv://" in (MONGO_URI or ""):
        _use_public_dns_for_srv()
    # Use certifi CA bundle to avoid SSL handshake errors with MongoDB Atlas (common on Windows)
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    try:
        await client.admin.command("ping")
    except ConnectionFailure as e:
        raise RuntimeError(f"MongoDB connection failed: {e}") from e


def get_db():
    if db is None:
        raise RuntimeError("Database not connected. Call connect_to_mongo() on startup.")
    return db


async def close_mongo():
    global client
    if client:
        client.close()
