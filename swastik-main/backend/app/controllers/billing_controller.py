import os
import hmac
import hashlib
from app.config.database import get_db
from app.ws.billing_ws import broadcast
from datetime import datetime
from bson import ObjectId

BILLS_COLLECTION = "bills"
COUNTERS_COLLECTION = "counters"
AUDIT_COLLECTION = "billing_audit"

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")


async def _audit(action: str, bill_id: str = None, user_id: str = "", details: dict = None, ip_address: str = "unknown"):
    """Append-only audit log for billing (no diagnosis, financial only) with IP trace."""
    db = get_db()
    await db[AUDIT_COLLECTION].insert_one({
        "action": action,
        "bill_id": bill_id,
        "user_id": user_id,
        "ip_address": ip_address,
        "timestamp": datetime.utcnow().isoformat(),
        "details": details or {},
    })


async def _next_invoice_number():
    """Generate SWH-YYYYMMDD-XXXX unique per day."""
    db = get_db()
    date_str = datetime.utcnow().strftime("%Y%m%d")
    key = f"invoice_{date_str}"
    doc = await db[COUNTERS_COLLECTION].find_one({"_id": key})
    if not doc:
        await db[COUNTERS_COLLECTION].insert_one({"_id": key, "seq": 1})
        seq = 1
    else:
        seq = doc.get("seq", 0) + 1
        await db[COUNTERS_COLLECTION].update_one({"_id": key}, {"$set": {"seq": seq}})
    return f"SWH-{date_str}-{seq:04d}"


async def get_billing_stats():
    """Derive all stats from live bills and payments in DB (no dummy data)."""
    db = get_db()
    bills_c = db[BILLS_COLLECTION]

    # Total billed and total paid from bills
    pipeline = [
        {"$project": {
            "total": {"$ifNull": ["$total", 0]},
            "insurance_covered": {"$ifNull": ["$insurance_covered", 0]},
            "payments_sum": {"$reduce": {
                "input": {"$ifNull": ["$payments", []]},
                "initialValue": 0,
                "in": {"$add": ["$$value", {"$ifNull": ["$$this.amount", 0]}]}
            }}
        }},
        {"$group": {
            "_id": None,
            "total_billed": {"$sum": "$total"},
            "total_insurance": {"$sum": "$insurance_covered"},
            "total_paid": {"$sum": "$payments_sum"}
        }}
    ]
    cur = bills_c.aggregate(pipeline)
    row = await cur.to_list(length=1)
    total_billed = float(row[0]["total_billed"]) if row else 0
    total_insurance = float(row[0]["total_insurance"]) if row else 0
    total_paid = float(row[0]["total_paid"]) if row else 0
    patient_payable = total_billed - total_insurance
    outstanding = max(0, patient_payable - total_paid)
    collection_rate = (total_paid / patient_payable * 100) if patient_payable > 0 else 0

    # Revenue by month (from payments in bills)
    from datetime import timedelta,datetime
    today = datetime.utcnow()
    revenue_trends = []
    for i in range(6):
        # First day of month i months ago
        month_start = today.replace( day=1, hour=0,minute=0, second=0, microsecond=0)
        for _ in range(i):
            month_start = (month_start - timedelta(days=1)).replace(day=1)
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        pipe_month = [
            {"$unwind": {"path": "$payments", "preserveNullAndEmptyArrays": True}},
            {"$match": {"payments": {"$ne": None}}},
            {"$addFields": {"payments.payment_date_parsed": {"$toDate": {"$ifNull": ["$payments.payment_date", "1970-01-01"]}}}},
            {"$match": {"payments.payment_date_parsed": {"$gte": month_start, "$lt": next_month}}},
            {"$group": {"_id": None, "sum": {"$sum": "$payments.amount"}}}
        ]
        cur_m = bills_c.aggregate(pipe_month)
        r = await cur_m.to_list(length=1)
        rev = float(r[0]["sum"]) if r else 0
        revenue_trends.append({"month": month_start.strftime("%b"), "revenue": round(rev / 100000, 1)})

    # Revenue today (payments with payment_date today)
    today_start = today.replace(
    hour=0,
    minute=0,
    second=0,
    microsecond=0 ) 
    pipe_today = [
        {"$unwind": {"path": "$payments", "preserveNullAndEmptyArrays": True}},
        {"$match": {"payments": {"$ne": None}}},
        {"$addFields": {"payments.pd": {"$toDate": {"$ifNull": ["$payments.payment_date", "1970-01-01"]}}}},
        {"$match": {"payments.pd": {"$gte": today_start}}},
        {"$group": {"_id": None, "sum": {"$sum": "$payments.amount"}}}
    ]
    cur_today = bills_c.aggregate(pipe_today)
    r_today = await cur_today.to_list(length=1)
    revenue_today = int(r_today[0]["sum"]) if r_today else 0

    # Bill counts: total, paid (due_amount 0), pending (due_amount > 0)
    pipe_count = [
        {"$project": {
            "total": {"$ifNull": ["$total", 0]},
            "insurance": {"$ifNull": ["$insurance_covered", 0]},
            "payments_sum": {"$reduce": {"input": {"$ifNull": ["$payments", []]}, "initialValue": 0, "in": {"$add": ["$$value", {"$ifNull": ["$$this.amount", 0]}]}}}
        }},
        {"$project": {
            "patient_payable": {"$subtract": ["$total", "$insurance"]},
            "payments_sum": 1
        }},
        {"$project": {
            "is_paid": {"$gte": ["$payments_sum", "$patient_payable"]}
        }},
        {"$group": {"_id": None, "total_invoices": {"$sum": 1}, "paid_count": {"$sum": {"$cond": ["$is_paid", 1, 0]}}}}
    ]
    cur_count = bills_c.aggregate(pipe_count)
    count_row = await cur_count.to_list(length=1)
    total_invoices = count_row[0]["total_invoices"] if count_row else 0
    paid_count = count_row[0]["paid_count"] if count_row else 0
    pending_count = total_invoices - paid_count

    # Payment methods breakdown (from all payments in bills)
    pipe_methods = [
        {"$unwind": {"path": "$payments", "preserveNullAndEmptyArrays": False}},
        {"$group": {"_id": {"$ifNull": ["$payments.method", "Other"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    cur_m = bills_c.aggregate(pipe_methods)
    method_rows = await cur_m.to_list(length=20)
    payment_methods = [{"label": r["_id"], "count": r["count"], "color": "#0f766e"} for r in method_rows]

    return {
        "revenue_today": revenue_today,
        "revenue_mtd": int(total_paid),
        "total_paid": int(total_paid),
        "outstanding": int(outstanding),
        "collection_rate": f"{collection_rate:.1f}%",
        "opd_share": "—",
        "revenue_trends": revenue_trends,
        "total_invoices": int(total_invoices),
        "paid_count": int(paid_count),
        "pending_count": int(pending_count),
        "revenue": int(total_paid),
        "status_breakdown": [
            {"label": "Paid", "count": paid_count, "color": "#059669"},
            {"label": "Pending", "count": pending_count, "color": "#d97706"},
        ],
        "payment_methods": payment_methods if payment_methods else [{"label": "—", "count": 0, "color": "#64748b"}],
        "summary_cards": [
            {"title": "Revenue (MTD)", "value": f"₹{(total_paid / 100000):.1f}L" if total_paid >= 100000 else f"₹{total_paid / 1000:.0f}K", "accent": "1"},
            {"title": "Outstanding", "value": f"₹{outstanding / 1000:.0f}K" if outstanding >= 1000 else f"₹{outstanding:.0f}", "accent": "2"},
            {"title": "Collection %", "value": f"{collection_rate:.1f}%", "accent": "3"},
            {"title": "Bills", "value": str(total_invoices), "accent": "4"}
        ]
    }


async def create_bill(data: dict):
    """Create bill. Audit: no diagnosis, financial only."""
    db = get_db()
    invoice_number = await _next_invoice_number()
    client_ip = data.get("ip_address", "unknown")
    doc = {
        "invoice_number": invoice_number,
        "patient_id": data.get("patient_id"),
        "patient_name": data.get("patient_name"),
        "uhid": data.get("uhid"),
        "visit_id": data.get("visit_id"),
        "admission_id": data.get("admission_id"),
        "subtotal": float(data.get("subtotal", 0)),
        "tax": float(data.get("tax", 0)),
        "discount": float(data.get("discount", 0)),
        "insurance_covered": float(data.get("insurance_covered", 0)),
        "total": float(data.get("total", 0)),
    }
    total = doc["total"]
    insurance = doc["insurance_covered"]
    doc["patient_payable"] = float(data.get("patient_payable") if data.get("patient_payable") is not None else (total - insurance))
    doc["due_amount"] = float(data.get("due_amount") if data.get("due_amount") is not None else doc["patient_payable"])
    doc["status"] = data.get("status", "Pending")
    doc["items"] = data.get("items", [])
    doc["payments"] = []
    doc["created_at"] = datetime.utcnow().isoformat()
    doc["created_by"] = data.get("created_by", "")
    result = await db[BILLS_COLLECTION].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc["_id"] = str(result.inserted_id)
    await _audit("bill_created", bill_id=doc["id"], user_id=doc.get("created_by", ""), details={"invoice_number": doc["invoice_number"]}, ip_address=client_ip)
    await broadcast("bill_created", {"bill_id": doc["id"], "invoice_number": doc["invoice_number"]})
    return doc


async def get_bills(skip: int = 0, limit: int = 100):
    db = get_db()
    cursor = db[BILLS_COLLECTION].find().sort("created_at", -1).skip(skip).limit(limit)
    bills = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["_id"] = str(doc["_id"])
        bills.append(doc)
    return bills


async def get_bill_by_id(bill_id: str):
    db = get_db()
    doc = await db[BILLS_COLLECTION].find_one({"_id": ObjectId(bill_id)})
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    doc["_id"] = str(doc["_id"])
    return doc


async def add_payment(bill_id: str, amount: float, method: str, transaction_reference: str = "", user_id: str = "", ip_address: str = "unknown"):
    """Add payment with receipt number. Audit: user, IP, time. Industry-standard: every payment gets a unique receipt."""
    db = get_db()
    receipt_number = await _next_receipt_number()
    payment_date = datetime.utcnow().isoformat()
    payment = {
        "amount": float(amount),
        "method": method,
        "transaction_reference": (transaction_reference or "").strip(),
        "payment_date": payment_date,
        "created_by": user_id,
        "ip_address": ip_address,
        "receipt_number": receipt_number,
    }
    bill = await db[BILLS_COLLECTION].find_one({"_id": ObjectId(bill_id)})
    if not bill:
        return None
    total_paid = sum(p.get("amount", 0) for p in bill.get("payments", [])) + float(amount)
    new_payments = bill.get("payments", []) + [payment]

    insurance_covered = float(bill.get("insurance_covered", 0))
    grand_total = float(bill.get("total", 0))
    patient_payable = grand_total - insurance_covered
    status = "Paid" if total_paid >= patient_payable else "Partial"
    due_amount = max(0, patient_payable - total_paid)

    await db[BILLS_COLLECTION].update_one(
        {"_id": ObjectId(bill_id)},
        {"$set": {"payments": new_payments, "status": status, "due_amount": due_amount}}
    )
    await _audit(
        "payment_entry",
        bill_id=bill_id,
        user_id=user_id,
        details={"amount": amount, "method": method, "status": status, "receipt_number": receipt_number, "transaction_ref": transaction_reference},
        ip_address=ip_address,
    )
    updated = await get_bill_by_id(bill_id)
    await broadcast("payment_updated", {"bill_id": bill_id, "status": status, "due_amount": due_amount})

    # Notify Receptionist
    try:
        from app.controllers import registration_controller
        await registration_controller.create_notification(
            recipient_role="receptionist",
            title="Payment Received",
            message=f"Payment of ₹{amount} ({method}) received for Invoice {bill.get('invoice_number')}.",
            type="info"
        )
    except Exception as e:
        print(f"Error creating billing notification: {e}")

    return {
        "bill": updated,
        "receipt_number": receipt_number,
        "payment_date": payment_date,
        "amount": float(amount),
        "method": method,
        "transaction_reference": payment["transaction_reference"],
    }


async def get_bills_by_patient(patient_id: str):
    db = get_db()
    cursor = db[BILLS_COLLECTION].find({"$or": [{"patient_id": patient_id}, {"uhid": patient_id}]}).sort("created_at", -1)
    bills = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["_id"] = str(doc["_id"])
        bills.append(doc)
    return bills


async def search_bills(q: str, skip: int = 0, limit: int = 50):
    """Search bills by UHID or patient name; returns bills with due_amount > 0 for pending payments."""
    if not (q or "").strip():
        return []
    db = get_db()
    q_trim = (q or "").strip()
    regex = {"$regex": q_trim, "$options": "i"}
    cursor = db[BILLS_COLLECTION].find({
        "$or": [
            {"uhid": regex},
            {"patient_id": regex},
            {"patient_name": regex},
        ]
    }).sort("created_at", -1).skip(skip).limit(limit)
    bills = []
    async for doc in cursor:
        total = float(doc.get("total", 0))
        insurance = float(doc.get("insurance_covered", 0))
        patient_payable = total - insurance
        paid = sum(p.get("amount", 0) for p in doc.get("payments", []))
        due = max(0, patient_payable - paid)
        doc["due_amount"] = due
        if due > 0:
            doc["id"] = str(doc["_id"])
            doc["_id"] = str(doc["_id"])
            bills.append(doc)
    return bills


async def _next_receipt_number():
    """Generate RCP-YYYYMMDD-XXXX unique per day."""
    db = get_db()
    date_str = datetime.utcnow().strftime("%Y%m%d")
    key = f"receipt_{date_str}"
    doc = await db[COUNTERS_COLLECTION].find_one({"_id": key})
    if not doc:
        await db[COUNTERS_COLLECTION].insert_one({"_id": key, "seq": 1})
        seq = 1
    else:
        seq = doc.get("seq", 0) + 1
        await db[COUNTERS_COLLECTION].update_one({"_id": key}, {"$set": {"seq": seq}})
    return f"RCP-{date_str}-{seq:04d}"


def _bill_due_amount(bill: dict) -> float:
    """Compute current due amount (supports partial, advance)."""
    total = float(bill.get("total", 0))
    insurance = float(bill.get("insurance_covered", 0))
    patient_payable = total - insurance
    total_paid = sum(float(p.get("amount", 0)) for p in bill.get("payments", []))
    return max(0, round(patient_payable - total_paid, 2))


async def create_razorpay_order(bill_id: str):
    """Create Razorpay order for unpaid/partial bill. Returns order_id, amount (paise), currency, key_id."""
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None
    import razorpay
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    bill = await get_bill_by_id(bill_id)
    if not bill:
        return None
    if bill.get("status") == "Paid":
        return None
    amount_due = _bill_due_amount(bill)
    if amount_due <= 0:
        return None
    amount_paise = int(round(amount_due * 100))
    if amount_paise < 100:
        return None
    try:
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": bill_id,
        })
        await get_db()[BILLS_COLLECTION].update_one(
            {"_id": ObjectId(bill_id)},
            {"$set": {"razorpay_pending_order_id": order["id"], "razorpay_order_amount": amount_due}},
        )
        await _audit(
            "razorpay_order_created",
            bill_id=bill_id,
            details={"order_id": order.get("id"), "amount_paise": amount_paise, "amount": amount_due},
        )
        return {
            "order_id": order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID,
        }
    except Exception:
        return None


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay signature using HMAC SHA256."""
    if not RAZORPAY_KEY_SECRET:
        return False
    payload = f"{order_id}|{payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def verify_razorpay_payment(
    bill_id: str,
    razorpay_payment_id: str,
    razorpay_order_id: str,
    razorpay_signature: str,
    ip_address: str = "unknown",
):
    """Verify signature, mark bill paid (or partial), store payment, generate receipt. Prevents duplicate by payment_id."""
    db = get_db()
    bill = await db[BILLS_COLLECTION].find_one({"_id": ObjectId(bill_id)})
    if not bill:
        return {"success": False, "error": "Bill not found"}
    for p in bill.get("payments", []):
        if p.get("payment_id") == razorpay_payment_id:
            await _audit("razorpay_duplicate_ignored", bill_id=bill_id, details={"payment_id": razorpay_payment_id}, ip_address=ip_address)
            return {"success": True, "bill": await get_bill_by_id(bill_id), "message": "Already recorded"}
    if not _verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        await db[BILLS_COLLECTION].update_one(
            {"_id": ObjectId(bill_id)},
            {"$set": {"paymentStatus": "failed", "razorpayLastError": "invalid_signature"}},
        )
        await _audit("razorpay_verify_failed", bill_id=bill_id, details={"reason": "invalid_signature"}, ip_address=ip_address)
        return {"success": False, "error": "Invalid payment signature"}
    receipt_number = await _next_receipt_number()
    amount_paid = sum(float(x.get("amount", 0)) for x in bill.get("payments", []))
    total = float(bill.get("total", 0))
    insurance = float(bill.get("insurance_covered", 0))
    patient_payable = total - insurance
    razorpay_order_amount = float(bill.get("razorpay_order_amount", 0)) or max(0, patient_payable - amount_paid)
    payment_entry = {
        "amount": razorpay_order_amount,
        "method": "Razorpay",
        "transaction_reference": razorpay_payment_id,
        "payment_date": datetime.utcnow().isoformat(),
        "payment_id": razorpay_payment_id,
        "razorpay_order_id": razorpay_order_id,
        "receipt_number": receipt_number,
        "payment_status": "completed",
        "payment_method": "Razorpay",
    }
    new_payments = bill.get("payments", []) + [payment_entry]
    total_paid = amount_paid + razorpay_order_amount
    status = "Paid" if total_paid >= patient_payable else "Partial"
    due_amount = max(0, round(patient_payable - total_paid, 2))
    update = {
        "payments": new_payments,
        "status": status,
        "due_amount": due_amount,
        "paymentStatus": "completed",
        "paymentMethod": "Razorpay",
        "paymentId": razorpay_payment_id,
        "razorpayOrderId": razorpay_order_id,
        "transactionDate": payment_entry["payment_date"],
        "receiptNumber": receipt_number,
    }
    await db[BILLS_COLLECTION].update_one(
        {"_id": ObjectId(bill_id)},
        {"$set": update, "$unset": {"razorpay_pending_order_id": "", "razorpay_order_amount": ""}},
    )
    await _audit(
        "razorpay_payment_verified",
        bill_id=bill_id,
        details={
            "payment_id": razorpay_payment_id,
            "order_id": razorpay_order_id,
            "amount": razorpay_order_amount,
            "receipt_number": receipt_number,
            "status": status,
        },
        ip_address=ip_address,
    )
    updated = await get_bill_by_id(bill_id)
    await broadcast("payment_updated", {"bill_id": bill_id, "status": status, "due_amount": due_amount})

    # Notify Receptionist
    try:
        from app.controllers import registration_controller
        await registration_controller.create_notification(
            recipient_role="receptionist",
            title="Online Payment Verified",
            message=f"Razorpay payment of ₹{razorpay_order_amount} verified for Invoice {bill.get('invoice_number')}.",
            type="info"
        )
    except Exception as e:
        print(f"Error creating online billing notification: {e}")

    return {"success": True, "bill": updated, "receipt_number": receipt_number}


BILLING_SETTINGS_COLLECTION = "billing_settings"
DEFAULT_SETTINGS = {
    "hospital_name": "Swastik Hospital",
    "default_tax_percent": 5,
    "upi_id": "chaitanyakaypure8-1@okaxis",
    "upi_recipient_name": "Chaitanya Kaypure",
    "receipt_footer": "Thank you for choosing us. Please retain this receipt for your records.",
    "currency": "INR",
}


async def get_billing_settings():
    """Return billing configuration from DB or defaults."""
    db = get_db()
    doc = await db[BILLING_SETTINGS_COLLECTION].find_one({"_id": "config"})
    if not doc:
        return {**DEFAULT_SETTINGS}
    out = {**DEFAULT_SETTINGS}
    for k in DEFAULT_SETTINGS:
        if k in doc:
            out[k] = doc[k]
    return out


async def update_billing_settings(settings: dict, user_id: str = "", ip_address: str = "unknown"):
    """Upsert billing settings (allowed keys only)."""
    db = get_db()
    allowed = set(DEFAULT_SETTINGS.keys())
    payload = {k: v for k, v in settings.items() if k in allowed}
    if not payload:
        return await get_billing_settings()
    payload["_id"] = "config"
    payload["updated_at"] = datetime.utcnow().isoformat()
    payload["updated_by"] = user_id
    await db[BILLING_SETTINGS_COLLECTION].update_one(
        {"_id": "config"},
        {"$set": payload},
        upsert=True,
    )
    await _audit("billing_settings_updated", user_id=user_id, details=payload, ip_address=ip_address)
    return await get_billing_settings()
