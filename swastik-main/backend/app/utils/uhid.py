"""Generate UHID: SWASTIK-YYYY-XXXXX (e.g. SWASTIK-2026-00001)."""
from datetime import datetime
from app.config.database import get_db


async def get_next_uhid_sequence():
    db = get_db()
    coll = db["counters"]
    doc = await coll.find_one_and_update(
        {"_id": "patient_uhid"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return doc["seq"]


async def generate_uhid():
    seq = await get_next_uhid_sequence()
    year = datetime.now().year
    return f"SWASTIK-{year}-{seq:05d}"
