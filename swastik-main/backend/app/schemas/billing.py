from pydantic import BaseModel, Field
from typing import Optional, List, Any


class BillItemCreate(BaseModel):
    category: str = ""
    item_name: str = ""
    quantity: float = 1
    price: float = 0
    tax: float = 0
    total: float = 0


class CreateBillRequest(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    uhid: Optional[str] = None
    visit_id: Optional[str] = None
    admission_id: Optional[str] = None
    subtotal: float = 0
    tax: float = 0
    discount: float = 0
    total: float = 0
    insurance_covered: float = 0
    patient_payable: float = 0
    due_amount: float = 0
    status: Optional[str] = "Pending"
    items: List[Any] = []
    created_by: str = ""


class AddPaymentRequest(BaseModel):
    amount: float = Field(..., ge=0)
    method: str = "Cash"
    transaction_reference: str = ""
    created_by: str = ""


class CreateRazorpayOrderRequest(BaseModel):
    billId: str


class VerifyRazorpayPaymentRequest(BaseModel):
    billId: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class BillingSettingsUpdate(BaseModel):
    hospital_name: Optional[str] = None
    default_tax_percent: Optional[float] = None
    upi_id: Optional[str] = None
    upi_recipient_name: Optional[str] = None
    receipt_footer: Optional[str] = None
    currency: Optional[str] = None
