from app.config.database import get_db
from datetime import datetime, timezone, timedelta
from bson import ObjectId


def _now():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


# ─── Activity Logs ────────────────────────────────────────────────────────────

async def get_logs(module: str = None, user: str = None, limit: int = 200):
    db = get_db()
    query = {}
    if module:
        query["module"] = module
    if user:
        query["user"] = user
    cursor = db["activity_logs"].find(query).sort("timestamp", -1).limit(limit)
    logs = []
    async for log in cursor:
        log["_id"] = str(log["_id"])
        logs.append(log)
    return logs


async def log_activity(user: str, module: str, action: str, ip: str = "-"):
    db = get_db()
    log_entry = {
        "timestamp": _now(),
        "user": user,
        "module": module,
        "action": action,
        "ip": ip,
    }
    await db["activity_logs"].insert_one(log_entry)
    return log_entry


# ─── Aggregated Admin Stats ───────────────────────────────────────────────────

async def get_admin_stats():
    db = get_db()
    today = datetime.now().strftime("%Y-%m-%d")

    patients_count = await db["patients"].count_documents({})
    opd_today = await db["opd_records"].count_documents({"date": {"$regex": f"^{today}"}})
    ipd_active = await db["ipd_records"].count_documents({"status": {"$ne": "discharged"}})
    doctors_count = await db["doctors"].count_documents({})
    users_count = await db["users"].count_documents({})
    active_users = await db["users"].count_documents({"status": {"$ne": "inactive"}})

    # Lab stats
    lab_pending = await db["lab_test_requests"].count_documents({
        "status": {"$nin": ["report-released", "report-ready", "results-verified"]}
    })
    lab_today = await db["lab_test_requests"].count_documents({
        "created_at": {"$regex": f"^{today}"}
    })

    # Billing stats
    revenue_today = 0
    pending_amount = 0
    try:
        pipeline_today = [
            {"$match": {"created_at": {"$regex": f"^{today}"}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        async for r in db["bills"].aggregate(pipeline_today):
            revenue_today = r.get("total", 0)

        pipeline_pending = [
            {"$match": {"status": {"$in": ["unpaid", "partial"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$balance_due"}}}
        ]
        async for r in db["bills"].aggregate(pipeline_pending):
            pending_amount = r.get("total", 0)
    except Exception:
        pass

    return {
        "patients": patients_count,
        "opd_today": opd_today,
        "ipd_active": ipd_active,
        "doctors": doctors_count,
        "staff_total": users_count,
        "staff_active": active_users,
        "lab_pending": lab_pending,
        "lab_today": lab_today,
        "revenue_today": revenue_today,
        "pending_amount": pending_amount,
    }


# ─── User Management ──────────────────────────────────────────────────────────

async def get_all_users():
    db = get_db()
    cursor = db["users"].find({}, {
        "_id": 1, "username": 1, "full_name": 1, "role": 1,
        "email": 1, "phone": 1, "status": 1, "last_login": 1, "created_at": 1
    }).sort("created_at", -1)
    users = []
    async for u in cursor:
        u["_id"] = str(u["_id"])
        u.setdefault("status", "active")
        users.append(u)
    return users


async def create_user(data: dict):
    from app.utils.auth import get_password_hash
    db = get_db()
    existing = await db["users"].find_one({"username": data["username"]})
    if existing:
        raise ValueError("Username already exists")
    email_val = (data.get("email") or "").strip()
    phone_val = (data.get("phone") or "").strip()
    doc = {
        "username": data["username"].strip(),
        "full_name": (data.get("full_name") or "").strip(),
        "email": email_val,
        "phone": phone_val,
        "role": data.get("role", "receptionist"),
        "allowed_emails": [email_val] if email_val else [],
        "hashed_password": get_password_hash(data["password"]),
        "status": "active",
        "created_at": _now(),
    }
    result = await db["users"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    del doc["hashed_password"]
    return doc


async def set_user_status(user_id: str, status: str, changed_by: str, ip: str = "-"):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise ValueError("Invalid user id")
    user = await db["users"].find_one({"_id": oid})
    if not user:
        raise ValueError("User not found")
    await db["users"].update_one({"_id": oid}, {"$set": {"status": status}})
    action = f"Set user '{user['username']}' status to {status}"
    await log_activity(changed_by, "Admin", action, ip)
    return {"ok": True, "username": user["username"], "status": status}


async def reset_user_password(user_id: str, new_password: str, changed_by: str, ip: str = "-"):
    from app.utils.auth import get_password_hash
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise ValueError("Invalid user id")
    user = await db["users"].find_one({"_id": oid})
    if not user:
        raise ValueError("User not found")
    await db["users"].update_one(
        {"_id": oid},
        {"$set": {"hashed_password": get_password_hash(new_password)}}
    )
    await log_activity(changed_by, "Admin", f"Reset password for '{user['username']}'", ip)
    return {"ok": True}


# ─── Live Data Feeds ──────────────────────────────────────────────────────────

async def get_live_billing(limit: int = 20):
    db = get_db()
    cursor = db["bills"].find(
        {},
        {"_id": 1, "patient_name": 1, "uhid": 1, "total_amount": 1,
         "balance_due": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit)
    rows = []
    async for b in cursor:
        b["_id"] = str(b["_id"])
        rows.append(b)
    return rows


async def get_live_lab(limit: int = 20):
    db = get_db()
    cursor = db["lab_test_requests"].find(
        {},
        {"_id": 1, "patient_name": 1, "uhid": 1, "test_name": 1,
         "status": 1, "created_at": 1, "doctor_name": 1}
    ).sort("created_at", -1).limit(limit)
    rows = []
    async for r in cursor:
        r["_id"] = str(r["_id"])
        rows.append(r)
    return rows


async def get_live_patients(limit: int = 20):
    db = get_db()
    cursor = db["patients"].find(
        {},
        {"_id": 1, "uhid": 1, "name": 1, "age": 1, "gender": 1,
         "phone": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit)
    rows = []
    async for p in cursor:
        p["_id"] = str(p["_id"])
        rows.append(p)
    return rows


# ─── System Health & Backup ─────────────────────────────────────────────────────

async def get_system_health():
    """Real-time system health for admin dashboard. Server, DB, API time, sessions, backup."""
    import time
    db = get_db()
    health = {
        "server": "Online",
        "database": "Disconnected",
        "api_time_ms": None,
        "active_sessions": 0,
        "storage_usage": "—",
        "backup_status": "Last: —",
    }
    start = time.perf_counter()
    try:
        await db["patients"].count_documents({})
        health["database"] = "Connected"
    except Exception:
        health["database"] = "Disconnected"
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    health["api_time_ms"] = elapsed_ms

    try:
        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")
        pipeline = [
            {"$match": {"timestamp": {"$gte": one_hour_ago}}},
            {"$group": {"_id": "$user", "n": {"$sum": 1}}},
            {"$count": "total"}
        ]
        async for r in db["activity_logs"].aggregate(pipeline):
            health["active_sessions"] = r.get("total", 0)
            break
    except Exception:
        pass

    try:
        last = await db["system_backup_log"].find_one(
            {},
            sort=[("triggered_at", -1)],
            projection={"triggered_at": 1}
        )
        if last and last.get("triggered_at"):
            ts = last["triggered_at"]
            if isinstance(ts, str) and len(ts) >= 16:
                health["backup_status"] = f"Last: {ts[11:16]}"
            else:
                health["backup_status"] = "Last: —"
    except Exception:
        pass

    return health


async def trigger_manual_backup(triggered_by: str):
    """Log a manual backup request. Optionally extend later with actual backup logic."""
    db = get_db()
    now = _now()
    await db["system_backup_log"].insert_one({
        "triggered_at": now,
        "triggered_by": triggered_by,
        "type": "manual",
    })
    await log_activity(triggered_by, "Admin", "Manual backup triggered", "-")
    return {"ok": True, "message": "Backup triggered", "triggered_at": now}


# ─── System Configuration ─────────────────────────────────────────────────────

async def get_system_config():
    db = get_db()
    config = await db["system_config"].find_one({"id": "current_settings"})
    if not config:
        # Default settings if none exist
        config = {
            "id": "current_settings",
            "consultation_fee": 500,
            "lab_base_fee": 300,
            "admission_deposit": 5000,
            "work_start": "08:00",
            "work_end": "20:00",
            "default_lab_tat": 24,
            "updated_at": _now()
        }
        await db["system_config"].insert_one(config)
    
    if "_id" in config:
        config["_id"] = str(config["_id"])
    return config


async def update_system_config(data: dict, updated_by: str = "admin", ip: str = "-"):
    db = get_db()
    data["updated_at"] = _now()
    # Ensure id remains fixed
    data["id"] = "current_settings"
    await db["system_config"].update_one(
        {"id": "current_settings"},
        {"$set": data},
        upsert=True
    )
    await log_activity(updated_by, "Admin", "Updated system configuration", ip)
    return await get_system_config()
