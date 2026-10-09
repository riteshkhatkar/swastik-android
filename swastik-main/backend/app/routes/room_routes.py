from fastapi import APIRouter, Query
from app.schemas.room import RoomCreate
from app.controllers import room_controller

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

@router.post("")
async def create_room(data: RoomCreate):
    return await room_controller.create_room(data)

@router.get("")
async def list_rooms(room_type: str = Query(None), status: str = Query(None)):
    return await room_controller.get_rooms(room_type=room_type, status=status)

@router.patch("/{room_id}/status")
@router.put("/{room_id}/status")
async def update_room_status(room_id: str, payload: dict):
    status = payload.get("status")
    return await room_controller.update_room_status(room_id, status)
