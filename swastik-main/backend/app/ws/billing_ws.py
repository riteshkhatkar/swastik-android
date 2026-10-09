"""In-memory WebSocket connections for billing real-time updates."""
import json
from typing import List
from fastapi import WebSocket

_connections: List[WebSocket] = []


async def register(ws: WebSocket):
    await ws.accept()
    _connections.append(ws)


def unregister(ws: WebSocket):
    if ws in _connections:
        _connections.remove(ws)


async def broadcast(event: str, payload: dict):
    """Broadcast to all connected billing dashboards."""
    msg = json.dumps({"event": event, "payload": payload})
    for ws in list(_connections):
        try:
            await ws.send_text(msg)
        except Exception:
            unregister(ws)
