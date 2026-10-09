from pydantic import BaseModel, Field
from typing import Optional

class RoomCreate(BaseModel):
    room_number: str
    room_type: str # General, Private, ICU
    bed_count: int = 1
    status: str = "Available" # Available, Occupied, Maintenance
    price_per_day: float

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    bed_count: Optional[int] = None
    status: Optional[str] = None
    price_per_day: Optional[float] = None
