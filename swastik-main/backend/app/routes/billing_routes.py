from fastapi import APIRouter, HTTPException, Depends, Request
from app.controllers import billing_controller
from app.schemas.billing import CreateBillRequest, AddPaymentRequest, CreateRazorpayOrderRequest, VerifyRazorpayPaymentRequest, BillingSettingsUpdate
from app.middleware.auth import require_role

router = APIRouter(tags=["billing"])


@router.get("/stats", dependencies=[Depends(require_role(["billing", "admin", "receptionist"]))])
async def get_billing_stats():
    return await billing_controller.get_billing_stats()


@router.get("/billing/settings", dependencies=[Depends(require_role(["billing", "admin"]))])
async def get_billing_settings():
    return await billing_controller.get_billing_settings()


@router.put("/billing/settings", dependencies=[Depends(require_role(["billing", "admin"]))])
async def update_billing_settings(request: Request, body: BillingSettingsUpdate):
    user_id = getattr(request.state, "user_id", "") or ""
    client_ip = request.client.host if request.client else "unknown"
    payload = body.model_dump(exclude_none=True)
    return await billing_controller.update_billing_settings(payload, user_id, client_ip)


@router.get("/billing/stats", dependencies=[Depends(require_role(["billing", "admin", "receptionist"]))])
async def get_billing_stats_legacy():
    """Legacy path for frontend."""
    return await billing_controller.get_billing_stats()


@router.post("/bills", dependencies=[Depends(require_role(["billing", "admin", "receptionist"]))])
async def create_bill(request: Request, data: CreateBillRequest):
    try:
        # Pass request IP for audit log
        payload = data.model_dump()
        payload["ip_address"] = request.client.host if request.client else "unknown"
        return await billing_controller.create_bill(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/bills", dependencies=[Depends(require_role(["billing", "admin", "receptionist"]))])
async def list_bills(skip: int = 0, limit: int = 100):
    return await billing_controller.get_bills(skip=skip, limit=limit)


@router.get("/bills/search")
async def search_bills(q: str = "", skip: int = 0, limit: int = 50):
    return await billing_controller.search_bills(q, skip, limit)


@router.get("/bills/patient/{patient_id}")
async def get_patient_bills(patient_id: str):
    # This might be needed by reception/doctors, no strict billing restrict here
    return await billing_controller.get_bills_by_patient(patient_id)


@router.get("/bills/{bill_id}")
async def get_bill(bill_id: str):
    bill = await billing_controller.get_bill_by_id(bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@router.post("/bills/{bill_id}/payment", dependencies=[Depends(require_role(["billing", "admin", "receptionist", "doctor", "patient"]))])
async def add_bill_payment(request: Request, bill_id: str, data: AddPaymentRequest):
    client_ip = request.client.host if request.client else "unknown"
    ref_required = ["UPI", "Card", "Insurance", "Online (Razorpay)"]
    if data.method in ref_required and not (data.transaction_reference or "").strip():
        raise HTTPException(status_code=400, detail="Transaction reference (UTR / Transaction ID) is required for this payment method.")
    result = await billing_controller.add_payment(
        bill_id,
        data.amount,
        data.method,
        data.transaction_reference or "",
        data.created_by or "",
        client_ip,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Bill not found")
    return result


@router.post("/create-razorpay-order", dependencies=[Depends(require_role(["billing", "admin", "receptionist", "doctor", "patient"]))])
async def create_razorpay_order(data: CreateRazorpayOrderRequest):
    """Create Razorpay order for a bill. Returns order_id, amount (paise), currency, key_id."""
    result = await billing_controller.create_razorpay_order(data.billId)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Could not create order. Check bill exists, is unpaid, and RAZORPAY_KEY_ID/SECRET are set.",
        )
    return result


@router.post("/verify-razorpay-payment")
async def verify_razorpay_payment(request: Request, data: VerifyRazorpayPaymentRequest):
    """Verify Razorpay signature and mark bill paid. Safe to call from frontend after checkout."""
    client_ip = request.client.host if request.client else "unknown"
    result = await billing_controller.verify_razorpay_payment(
        data.billId,
        data.razorpay_payment_id,
        data.razorpay_order_id,
        data.razorpay_signature,
        client_ip,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Verification failed"))
    return result
