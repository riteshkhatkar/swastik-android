import sys
from pathlib import Path

# Ensure backend root is on path so "services" package (backend/services/) is importable
_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.config.database import connect_to_mongo, close_mongo
from app.controllers.auth_controller import ensure_default_user
from app.routes import auth_routes, registration_routes, report_routes, patient_record_routes, admin_routes, lab_routes, clinical_routes, billing_routes, emr_routes, token_routes, session_routes, admission_routes, room_routes, doctor_settings_routes, discharge_routes
from app.ws.billing_ws import register, unregister

app = FastAPI(title="Swastik Hospital API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://swastik.orelse.ai", "https://swastik.orelse.ai",
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
        "http://localhost:3002", "http://127.0.0.1:3002",
        "http://localhost:3003", "http://127.0.0.1:3003",
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:8000", "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    try:
        await connect_to_mongo()
        print("Connected to MongoDB")
    except Exception as e:
        print(f"FAILED to connect to MongoDB: {e}")
        return

    try:
        await ensure_default_user()
        print("Default users check complete")
    except Exception as e:
        print(f"FAILED to ensure default users: {e}")

    try:
        from app.controllers import lab_controller
        await lab_controller.seed_catalog_if_empty()
        print("Lab catalog check complete")
    except Exception as e:
        print(f"FAILED to seed lab catalog: {e}")

    try:
        from app.controllers import lab_controller
        await lab_controller.seed_dummy_lab_data()
        print("Lab dummy data check complete")
    except Exception as e:
        print(f"FAILED to seed lab dummy data: {e}")
        
    try:
        from app.controllers import registration_controller, room_controller
        await registration_controller.seed_doctors()
        await registration_controller.seed_beds()
        await room_controller.seed_rooms()
        print("Doctors, Beds and Rooms seed check complete")
    except Exception as e:
        print(f"FAILED to seed doctors/beds/rooms: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo()


@app.get("/")
async def root():
    return {"message": "Swastik Hospital Backend Running"}


# app.include_router(test_sms_router, prefix="/api") # Removed redundant Fast2SMS test router
app.include_router(auth_routes.router, prefix="/auth", tags=["auth"])
app.include_router(registration_routes.router, prefix="/api")
app.include_router(report_routes.router, prefix="/api/reports", tags=["reports"])
app.include_router(patient_record_routes.router, prefix="/api/patient-records", tags=["patient-records"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])
app.include_router(lab_routes.router, prefix="/api/lab", tags=["Lab"])
app.include_router(clinical_routes.router, prefix="/api/clinical", tags=["Clinical"])
app.include_router(emr_routes.router, prefix="/api/emr", tags=["EMR"])
app.include_router(billing_routes.router, prefix="/api")
app.include_router(session_routes.router, prefix="/api/session", tags=["Session"])
app.include_router(admission_routes.router, prefix="/api/admissions", tags=["Admissions"])
app.include_router(room_routes.router) # Prefix /api/rooms is inside room_routes
app.include_router(doctor_settings_routes.router, prefix="/api/doctor", tags=["Doctor Settings"])
app.include_router(token_routes.router)
app.include_router(discharge_routes.router)


@app.websocket("/ws/billing")
async def ws_billing(websocket: WebSocket):
    await register(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        unregister(websocket)
