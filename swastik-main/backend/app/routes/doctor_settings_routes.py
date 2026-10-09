from fastapi import APIRouter, Depends
from app.controllers import doctor_settings_controller
from app.schemas.doctor_settings import DoctorProfileUpdate, PasswordChangeRequest, CustomQuestionsUpdate
from app.middleware.auth import require_role

router = APIRouter(tags=["doctor-settings"])

# Protected routes for doctor only
@router.get("/profile")
async def get_profile(current_user: dict = Depends(require_role(["doctor"]))):
    return await doctor_settings_controller.get_doctor_profile(current_user["sub"])

@router.put("/profile")
async def update_profile(data: DoctorProfileUpdate, current_user: dict = Depends(require_role(["doctor"]))):
    return await doctor_settings_controller.update_doctor_profile(current_user["sub"], data)

@router.put("/change-password")
async def change_password(data: PasswordChangeRequest, current_user: dict = Depends(require_role(["doctor"]))):
    return await doctor_settings_controller.change_password(current_user["sub"], data)

@router.get("/custom-questions")
async def get_custom_questions(current_user: dict = Depends(require_role(["doctor"]))):
    return await doctor_settings_controller.get_custom_questions(current_user["sub"])

@router.put("/custom-questions")
async def update_custom_questions(data: CustomQuestionsUpdate, current_user: dict = Depends(require_role(["doctor"]))):
    return await doctor_settings_controller.update_custom_questions(current_user["sub"], data)
