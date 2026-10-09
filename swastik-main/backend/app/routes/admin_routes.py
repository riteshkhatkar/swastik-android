from fastapi import APIRouter, HTTPException, Request, Depends
from app.controllers import admin_controller
from app.middleware.auth import require_role
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["admin"])



# ─── Schemas ──────────────────────────────────────────────────────────────────

class ActivityLogCreate(BaseModel):
    user: str
    module: str
    action: str
    ip: Optional[str] = "-"


class UserCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    role: str
    password: str


class UserStatusUpdate(BaseModel):
    status: str  # "active" | "inactive"


class PasswordReset(BaseModel):
    new_password: str


class SystemConfig(BaseModel):
    consultation_fee: int
    lab_base_fee: int
    admission_deposit: int
    work_start: str
    work_end: str
    default_lab_tat: int


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats", dependencies=[Depends(require_role(["admin"]))])
async def get_admin_stats():
    return await admin_controller.get_admin_stats()


# ─── Audit Logs ───────────────────────────────────────────────────────────────

@router.get("/logs", dependencies=[Depends(require_role(["admin"]))])
async def get_logs(module: str = None, user: str = None, limit: int = 200):
    return await admin_controller.get_logs(module=module, user=user, limit=limit)


@router.post("/logs")
async def create_log(request: Request, log: ActivityLogCreate):
    ip = log.ip or (request.client.host if request.client else "-")
    return await admin_controller.log_activity(log.user, log.module, log.action, ip)


# ─── User Management ──────────────────────────────────────────────────────────

@router.get("/users", dependencies=[Depends(require_role(["admin"]))])
async def list_users():
    return await admin_controller.get_all_users()


@router.post("/users", dependencies=[])
async def create_user(request: Request, data: UserCreate, current_user: dict = Depends(require_role(["admin"]))):
    ip = request.client.host if request.client else "-"
    caller = current_user.get("sub", "admin")
    try:
        user = await admin_controller.create_user(data.model_dump())
        await admin_controller.log_activity(caller, "Admin", f"Created user '{data.username}' with role {data.role}", ip)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}/status")
async def set_user_status(request: Request, user_id: str, body: UserStatusUpdate, current_user: dict = Depends(require_role(["admin"]))):
    ip = request.client.host if request.client else "-"
    caller = current_user.get("sub", "admin")
    try:
        return await admin_controller.set_user_status(user_id, body.status, caller, ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/users/{user_id}/reset-password")
async def reset_password(request: Request, user_id: str, body: PasswordReset, current_user: dict = Depends(require_role(["admin"]))):
    ip = request.client.host if request.client else "-"
    caller = current_user.get("sub", "admin")
    try:
        return await admin_controller.reset_user_password(user_id, body.new_password, caller, ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── Live Data Feeds ──────────────────────────────────────────────────────────

@router.get("/live-billing", dependencies=[Depends(require_role(["admin"]))])
async def live_billing(limit: int = 20):
    return await admin_controller.get_live_billing(limit)


@router.get("/live-lab", dependencies=[Depends(require_role(["admin"]))])
async def live_lab(limit: int = 20):
    return await admin_controller.get_live_lab(limit)


@router.get("/live-patients", dependencies=[Depends(require_role(["admin"]))])
async def live_patients(limit: int = 20):
    return await admin_controller.get_live_patients(limit)


# ─── System Health & Backup ────────────────────────────────────────────────────

@router.get("/health", dependencies=[Depends(require_role(["admin"]))])
async def get_system_health():
    """Real-time system health: server, database, API time, sessions, backup status."""
    return await admin_controller.get_system_health()


@router.post("/backup", dependencies=[Depends(require_role(["admin"]))])
async def trigger_backup(request: Request, current_user: dict = Depends(require_role(["admin"]))):
    """Trigger manual backup (logs the action; extend with actual backup logic if needed)."""
    triggered_by = current_user.get("sub") or current_user.get("username") or "admin"
    return await admin_controller.trigger_manual_backup(triggered_by)


# ─── System Configuration ─────────────────────────────────────────────────────

@router.get("/config", dependencies=[Depends(require_role(["admin", "billing", "receptionist"]))])
async def get_system_config():
    return await admin_controller.get_system_config()


@router.post("/config", dependencies=[Depends(require_role(["admin"]))])
async def update_system_config(request: Request, config: SystemConfig, current_user: dict = Depends(require_role(["admin"]))):
    ip = request.client.host if request.client else "-"
    caller = current_user.get("sub", "admin")
    return await admin_controller.update_system_config(config.model_dump(), caller, ip)
