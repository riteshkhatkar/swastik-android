from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.auth import LoginRequest
from app.controllers import auth_controller
from app.middleware.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(tags=["auth"])


class GoogleLoginRequest(BaseModel):
    token: str
    role: str


@router.post("/login")
async def login(request: Request, credentials: LoginRequest):
    ip = request.client.host if request.client else "-"
    return await auth_controller.login_user(credentials, ip=ip)


@router.post("/google")
async def google_login(request: Request, body: GoogleLoginRequest):
    ip = request.client.host if request.client else "-"
    return await auth_controller.login_google_user(body.token, body.role, ip=ip)


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return {
        "username": user.get("sub"),
        "id": user.get("id"),
        "role": user.get("role", "admin"),
        "full_name": user.get("full_name")
    }

