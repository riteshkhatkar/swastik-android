import React, { useState, useEffect, useCallback } from "react";
import QRCode from "react-qr-code";
import hospitalLogo from "../../../assets/swasstiklogo.png";
import gpayImg from "../../../assets/Gpay.png";
import phonepeImg from "../../../assets/phone pay.png";
import paytmImg from "../../../assets/paytm.png";
import { api } from "../../../api/service";
import "./RazorpayModal.css";

const HOSPITAL_NAME = "Swastik Hospital";
const UPI_ID = "chaitanyakaypure8-1@okaxis";
const UPI_RECIPIENT_NAME = "Chaitanya Kaypure";
const QR_VALID_SECONDS = 600; // 10 minutes

function RazorpayModal({
  open,
  onClose,
  billAmount,
  patientName,
  billId,
  onPaymentSuccess,
  onVerifySuccess,
  disabled,
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("razorpay_auto");
  const [qrValue, setQrValue] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QR_VALID_SECONDS);
  const [transactionReference, setTransactionReference] = useState("");
  const [error, setError] = useState(null);

  const isUpiSelected = ["gpay", "phonepe", "paytm"].includes(selectedMethod);

  const setUpiMethod = useCallback(
    (method) => {
      setSelectedMethod(method);
      const amount = Number(billAmount) || 0;
      const upiString = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_RECIPIENT_NAME)}&am=${amount}&cu=INR`;
      setQrValue(upiString);
      setTimeLeft(QR_VALID_SECONDS);
      setError(null);
    },
    [billAmount]
  );

  const setNonUpiMethod = useCallback((method) => {
    setSelectedMethod(method);
    setQrValue(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedMethod(null);
      setQrValue(null);
      setTransactionReference("");
      setTimeLeft(QR_VALID_SECONDS);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!qrValue || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setQrValue(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [qrValue, timeLeft]);

  const handleConfirm = async () => {
    if (loading || disabled || !billAmount || billAmount <= 0 || !selectedMethod) return;

    // If it's a UPI or manual entry
    if (isUpiSelected || transactionReference.trim()) {
      setLoading(true);
      setError(null);
      try {
        const methodLabel = isUpiSelected ? "UPI" : selectedMethod === "card" ? "Card" : selectedMethod === "netbanking" ? "Netbanking" : "Online (Razorpay)";
        const finalReference = transactionReference.trim() || `UPI-AUTOGEN-${Date.now()}`;

        const options = {
          method: methodLabel,
          transactionReference: finalReference,
        };
        const result = await onPaymentSuccess(billAmount, options);
        if (result && result.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
            setLoading(false);
            setSuccess(false);
          }, 1500);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
        setError(err.message || "Manual verification failed.");
      }
      return;
    }

    // Automated Razorpay Flow
    if (!billId) {
      setError("Bill ID missing. Save draft first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const order = await api.createRazorpayOrder(billId);
      if (!order || !order.order_id) {
        throw new Error("Failed to create Razorpay order.");
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: HOSPITAL_NAME,
        description: `Payment for Bill #${billId}`,
        image: hospitalLogo,
        order_id: order.order_id,
        prefill: {
          name: patientName || "",
        },
        handler: async function (response) {
          setLoading(true);
          try {
            const verifyRes = await api.verifyRazorpayPayment(billId, response);
            if (verifyRes && verifyRes.success) {
              setSuccess(true);
              if (onVerifySuccess) onVerifySuccess(verifyRes);
              setTimeout(() => {
                onClose();
                setLoading(false);
                setSuccess(false);
              }, 1500);
            } else {
              setError(verifyRes.error || "Verification failed.");
              setLoading(false);
            }
          } catch (err) {
            setError(err.message || "Verification failed.");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        },
        theme: {
          color: "#059669"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setLoading(false);
      setError(err.message || "Could not launch Razorpay.");
    }
  };

  const handleCancel = () => {
    if (!loading) onClose();
  };

  const qrExpired = isUpiSelected && timeLeft <= 0;
  const isConfirmDisabled =
    loading ||
    disabled ||
    !billAmount ||
    billAmount <= 0 ||
    selectedMethod === null ||
    (isUpiSelected && (!qrValue || qrExpired));

  const optionCardClass = (method) =>
    "razorpay-option-card " + (selectedMethod === method ? "razorpay-option-card--selected" : "");

  if (!open) return null;

  return (
    <div
      className="razorpay-modal-overlay"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="razorpay-modal-title"
    >
      <div className="razorpay-modal razorpay-modal--open" onClick={(e) => e.stopPropagation()}>
        <div className="razorpay-modal__left">
          <div className="razorpay-modal__logo-wrap">
            <img src={hospitalLogo} alt="" className="razorpay-modal__logo" aria-hiddenContainer />
          </div>
          <h2 className="razorpay-modal__hospital">{HOSPITAL_NAME}</h2>
          <p className="razorpay-modal__amount">
            ₹{Number(billAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="razorpay-modal__patient">{patientName || "—"}</p>
          <span className="razorpay-modal__secure">Secure Payment</span>
        </div>
        <div className="razorpay-modal__right">
          <h3 id="razorpay-modal-title" className="razorpay-modal__title">
            Payment Options
          </h3>
          <p className="razorpay-modal__select-label">Select a payment method</p>

          <div className="razorpay-modal__divider razorpay-modal__divider--top" />

          {error && <div className="razorpay-modal__error" style={{ color: "red", fontSize: "0.85rem", marginBottom: "8px" }}>{error}</div>}

          <div className="razorpay-modal__section">
            <span className="razorpay-modal__section-label">Automated Payment (No UTR Required)</span>
            <div
              className={optionCardClass("razorpay_auto")}
              onClick={() => setNonUpiMethod("razorpay_auto")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setNonUpiMethod("razorpay_auto")}
            >
              <div className="razorpay-modal__icon-row">
                <span className="razorpay-modal__card-icon" aria-hidden>⚡</span>
                <span>Razorpay Checkout (Fast & Secure)</span>
              </div>
              {selectedMethod === "razorpay_auto" && (
                <span className="razorpay-option-card__tick" aria-hidden>✓</span>
              )}
            </div>
          </div>

          <div className="razorpay-modal__divider" />

          <div className="razorpay-modal__section">
            <span className="razorpay-modal__section-label">Manual UPI QR</span>
            <div className="razorpay-modal__upi-row">
              <div
                className={optionCardClass("gpay")}
                onClick={() => setUpiMethod("gpay")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setUpiMethod("gpay")}
                aria-pressed={selectedMethod === "gpay"}
              >
                <img src={gpayImg} alt="Google Pay" className="razorpay-modal__upi-img" />
                {selectedMethod === "gpay" && (
                  <span className="razorpay-option-card__tick" aria-hidden>✓</span>
                )}
              </div>
              <div
                className={optionCardClass("phonepe")}
                onClick={() => setUpiMethod("phonepe")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setUpiMethod("phonepe")}
                aria-pressed={selectedMethod === "phonepe"}
              >
                <img src={phonepeImg} alt="PhonePe" className="razorpay-modal__upi-img" />
                {selectedMethod === "phonepe" && (
                  <span className="razorpay-option-card__tick" aria-hidden>✓</span>
                )}
              </div>
              <div
                className={optionCardClass("paytm")}
                onClick={() => setUpiMethod("paytm")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setUpiMethod("paytm")}
                aria-pressed={selectedMethod === "paytm"}
              >
                <img src={paytmImg} alt="Paytm" className="razorpay-modal__upi-img" />
                {selectedMethod === "paytm" && (
                  <span className="razorpay-option-card__tick" aria-hidden>✓</span>
                )}
              </div>
            </div>
          </div>

          {isUpiSelected && (
            <div className="razorpay-modal__qr-section">
              <div className="razorpay-modal__qr-box razorpay-modal__qr-box--upi">
                <div className="razorpay-modal__qr-recipient">
                  <span className="razorpay-modal__qr-avatar" aria-hidden>C</span>
                  <span className="razorpay-modal__qr-recipient-name">{UPI_RECIPIENT_NAME}</span>
                </div>
                <div className="razorpay-modal__qr-code-wrap">
                  {qrValue ? (
                    <QRCode value={qrValue} size={200} className="razorpay-modal__qr-code" />
                  ) : (
                    <div className="razorpay-modal__qr-placeholder">Loading…</div>
                  )}
                </div>
                <p className="razorpay-modal__qr-upi-id">UPI ID: {UPI_ID}</p>
                <p className="razorpay-modal__qr-scan-hint">Scan to pay with any UPI app</p>
                {qrValue && (
                  <>
                    <p className="razorpay-modal__qr-timer">
                      Valid for {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                    </p>
                    {timeLeft > 0 && (
                      <p className="razorpay-modal__qr-waiting">Waiting for payment...</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}


          <div className="razorpay-modal__divider" />

          <div className="razorpay-modal__actions">
            <button
              type="button"
              className={`billing-btn billing-btn--primary razorpay-modal__btn razorpay-modal__btn--confirm ${isConfirmDisabled ? "razorpay-modal__btn--disabled" : ""}`}
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
            >
              {loading ? (
                <>
                  <span className="razorpay-modal__spinner" aria-hidden />
                  Processing…
                </>
              ) : success ? (
                <>
                  <span className="razorpay-modal__success-icon" aria-hidden>✓</span>
                  Payment Successful
                </>
              ) : selectedMethod === "razorpay_auto" ? (
                "Launch Automated Checkout"
              ) : (
                "Confirm Manual Payment"
              )}
            </button>
            <button
              type="button"
              className="billing-btn billing-btn--secondary razorpay-modal__btn"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RazorpayModal;
