import React, { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

const UPI_ID = "swastik.hospital@paytm";
const QR_VALID_SECONDS = 5 * 60; // 5 minutes

function UPIPaymentPanel({
  amount,
  invoiceNumber,
  onPaymentConfirmed,
  onStatusChange,
  disabled,
}) {
  const [secondsLeft, setSecondsLeft] = useState(QR_VALID_SECONDS);
  const [status, setStatus] = useState("waiting"); // waiting | received | failed | timeout
  const [utr, setUtr] = useState("");
  const [bankName, setBankName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const upiString = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent("Swastik Hospital")}&am=${Number(amount).toFixed(2)}&tn=${encodeURIComponent("Invoice-" + (invoiceNumber || ""))}`;

  const resetTimer = useCallback(() => {
    setSecondsLeft(QR_VALID_SECONDS);
    setStatus("waiting");
    setShowConfirm(false);
    onStatusChange?.("waiting");
  }, [onStatusChange]);

  useEffect(() => {
    if (disabled || status !== "waiting") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setStatus("timeout");
          onStatusChange?.("timeout");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [disabled, status, onStatusChange]);

  const handleConfirmPayment = () => {
    if (!utr.trim()) return;
    setStatus("received");
    setPaymentCompleted(true);
    onStatusChange?.("received");
    onPaymentConfirmed?.({
      amount: Number(amount),
      method: "UPI",
      transaction_reference: utr,
      bank_name: bankName,
      status: "Completed",
    });
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const copyUpiLink = () => {
    try {
      navigator.clipboard.writeText(upiString);
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 2000);
    } catch {}
  };

  return (
    <div className="create-invoice-upi">
      <div className="create-invoice-upi__card">
        <div className="create-invoice-upi__badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <span>Secure payment</span>
        </div>
        <p className="create-invoice-upi__powered">Powered by Swastik SecurePay</p>

        <div className="create-invoice-upi__amount-wrap">
          <span className="create-invoice-upi__amount-label">Pay Amount</span>
          <span className="create-invoice-upi__amount">₹{Number(amount).toFixed(2)}</span>
        </div>

        {status === "timeout" ? (
          <div className="create-invoice-upi__timeout">
            <p>QR expired. Click below to generate new QR.</p>
            <button type="button" className="billing-btn billing-btn--primary" onClick={resetTimer}>Regenerate QR</button>
          </div>
        ) : (
          <>
            <div className="create-invoice-upi__qr-wrap">
              <QRCodeSVG value={upiString} size={200} level="M" includeMargin />
            </div>
            <div className="create-invoice-upi__timer">
              <span className={secondsLeft <= 60 ? "create-invoice-upi__timer--low" : ""}>{formatTime(secondsLeft)}</span>
              <span> remaining</span>
            </div>

            <div className="create-invoice-upi__status">
              {status === "waiting" && <p className="create-invoice-upi__status-msg create-invoice-upi__status--waiting">Waiting for payment...</p>}
              {status === "received" && <p className="create-invoice-upi__status-msg create-invoice-upi__status--received">Payment received</p>}
              {status === "failed" && <p className="create-invoice-upi__status-msg create-invoice-upi__status--failed">Payment failed</p>}
              {status === "timeout" && <p className="create-invoice-upi__status-msg create-invoice-upi__status--timeout">Timeout</p>}
            </div>

            <button type="button" className="billing-btn billing-btn--secondary create-invoice-upi__copy" onClick={copyUpiLink}>
              {showConfirm ? "Copied!" : "Copy UPI payment link"}
            </button>

            <div className="create-invoice-upi__verify">
              <h4>Transaction verification</h4>
              <input type="text" placeholder="UTR / Reference number" value={utr} onChange={(e) => setUtr(e.target.value)} className="create-invoice-upi__input" />
              <input type="text" placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} className="create-invoice-upi__input" />
              <button type="button" className="billing-btn billing-btn--primary" onClick={handleConfirmPayment} disabled={!utr.trim() || disabled}>
                Confirm Payment
              </button>
            </div>
          </>
        )}
      </div>
      {paymentCompleted && <div className="create-invoice-upi__done" aria-live="polite">Payment completed</div>}
    </div>
  );
}

export default UPIPaymentPanel;
