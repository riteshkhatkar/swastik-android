/**
 * Payment service – future-ready for real Razorpay API.
 * Currently simulates online payment; replace simulateRazorpay with real API when ready.
 */

const PAYMENT_DELAY_MS = 2000;

/**
 * Simulate Razorpay payment (2s delay, returns txn id and receipt).
 * Replace this with real Razorpay order + verification when integrating live.
 * @param {number} amount - Payment amount
 * @returns {Promise<{ success: boolean, transactionId?: string, receiptNumber?: string, paymentDate?: string, status?: string }>}
 */
export async function simulateRazorpay(amount) {
  await new Promise((resolve) => setTimeout(resolve, PAYMENT_DELAY_MS));
  const txnId = "TXN" + Date.now();
  const now = new Date();
  const year = now.getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const receiptNumber = "SWASTIK-" + year + "-" + randomNum;
  const paymentDate = now.toISOString().slice(0, 10);
  return {
    success: true,
    transactionId: txnId,
    receiptNumber,
    paymentDate,
    status: "Completed",
  };
}

/**
 * Process payment by method. For "Online" uses simulated Razorpay; for others no-op (caller handles).
 * @param {string} method - e.g. "Online", "Online (Razorpay)", "Cash"
 * @param {number} amount - Amount to process
 * @returns {Promise<{ success: boolean, transactionId?: string, receiptNumber?: string, paymentDate?: string, status?: string }|null>}
 */
export async function processPayment(method, amount) {
  const normalized = (method || "").toLowerCase();
  if (normalized.includes("online") || normalized.includes("razorpay")) {
    return simulateRazorpay(amount);
  }
  return null;
}
