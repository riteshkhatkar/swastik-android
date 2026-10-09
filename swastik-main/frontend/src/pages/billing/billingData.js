/**
 * Billing module – integrates with receptionist (patients) and doctor (visits).
 * No diagnosis or clinical notes. Financial data only.
 */

import { STORAGE_KEYS, getAdmissionRequests } from "../receptionist/receptionistData";

export const BILLING_STORAGE = {
  BILLS: "swastik_billing_bills",
  INVOICE_COUNTER: "swastik_billing_invoice_counter",
};

export function getPatientsForBilling() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_PATIENTS);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((p) => ({
      uhid: p.uhid,
      fullName: p.fullName,
      contact: p.contact,
      email: p.email || "",
      caseNumber: p.caseNumber,
      visitType: p.visitType || "OPD",
      riskFlag: p.riskFlag === true,
      selfPay: p.selfPay === true,
      insuranceProvider: p.insuranceProvider || "",
    }));
  } catch {
    return [];
  }
}

export function searchPatients(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) return getPatientsForBilling();
  const patients = getPatientsForBilling();
  return patients.filter(
    (p) =>
      (p.uhid || "").toLowerCase().includes(q) ||
      (p.fullName || "").toLowerCase().includes(q) ||
      (p.contact || "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))
  );
}

export function getAdmissionStatus(uhid) {
  const list = getAdmissionRequests();
  const adm = list.find((a) => a.uhid === uhid || a.patientId === uhid);
  if (!adm) return null;
  return { status: adm.status, ward: adm.ward, bedNumber: adm.bedNumber };
}

export function getVisitsForPatient(uhid) {
  try {
    const raw = localStorage.getItem("swastik_visits");
    const visits = raw ? JSON.parse(raw) : [];
    return Array.isArray(visits) ? visits.filter((v) => v.uhid === uhid || v.patientId === uhid) : [];
  } catch {
    return [];
  }
}

function getInvoiceCounterKey(date) {
  return `${BILLING_STORAGE.INVOICE_COUNTER}-${date}`;
}

export function generateInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const key = getInvoiceCounterKey(date);
  let n = 1;
  try {
    const raw = localStorage.getItem(key);
    if (raw) n = parseInt(raw, 10) + 1;
  } catch { }
  localStorage.setItem(key, String(n));
  const seq = String(n).padStart(4, "0");
  return `SWH-${date}-${seq}`;
}

export function getBills() {
  try {
    const raw = localStorage.getItem(BILLING_STORAGE.BILLS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBill(bill) {
  const list = getBills();
  const idx = list.findIndex((b) => b.id === bill.id);
  const next = idx >= 0 ? list.map((b, i) => (i === idx ? bill : b)) : [...list, bill];
  localStorage.setItem(BILLING_STORAGE.BILLS, JSON.stringify(next));
  return bill;
}

export function getBillsByPatient(patientId) {
  return getBills().filter((b) => b.patientId === patientId || b.uhid === patientId);
}

const CATEGORIES = ["Consultation", "Therapy", "Medication", "IPD", "Emergency", "Lab", "Procedure"];

export function getDefaultItemsForVisitType(visitType) {
  switch (visitType) {
    case "opd":
      return [{ category: "Consultation", itemName: "OPD Consultation", quantity: 1, unitPrice: 500, taxPercent: 5 }];
    case "therapy":
      return [{ category: "Therapy", itemName: "Therapy Session", quantity: 1, unitPrice: 1200, taxPercent: 5 }];
    case "emergency":
      return [
        { category: "Emergency", itemName: "Emergency Consult", quantity: 1, unitPrice: 1000, taxPercent: 5 },
        { category: "Emergency", itemName: "Crisis Management", quantity: 1, unitPrice: 500, taxPercent: 5 },
      ];
    case "admission":
      return [
        { category: "IPD", itemName: "Bed charges (per day)", quantity: 1, unitPrice: 2000, taxPercent: 5 },
        { category: "IPD", itemName: "Nursing charges", quantity: 1, unitPrice: 500, taxPercent: 5 },
      ];
    default:
      return [{ category: "Consultation", itemName: "Consultation", quantity: 1, unitPrice: 500, taxPercent: 5 }];
  }
}

export { CATEGORIES };
