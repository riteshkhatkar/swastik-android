import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  searchPatients,
  getAdmissionStatus,
  getDefaultItemsForVisitType,
  CATEGORIES,
  generateInvoiceNumber,
} from "../billingData";
import { api } from "../../../api/service";
import UPIPaymentPanel from "./UPIPaymentPanel";
import RazorpayModal from "./RazorpayModal";
import hospitalLogo from "../../../assets/swasstiklogo.png";
import "./CreateInvoiceView.css";

const PAYMENT_METHODS = ["Cash", "Online (Razorpay)", "UPI", "Card", "Insurance"];
const BILL_STATUS = { DRAFT: "Draft", AWAITING: "Awaiting Payment", PARTIAL: "Partially Paid", PAID: "Paid", OVERDUE: "Overdue" };

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

const emptyItem = () => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  category: "Consultation",
  itemName: "",
  quantity: 1,
  unitPrice: 0,
  taxPercent: 5,
  itemDiscount: 0,
});

function getBillStatus(grandTotal, totalPaid, dueDate, isFinalized) {
  if (isFinalized) return totalPaid >= grandTotal ? BILL_STATUS.PAID : BILL_STATUS.PARTIAL;
  if (grandTotal <= 0) return BILL_STATUS.DRAFT;
  if (totalPaid >= grandTotal) return BILL_STATUS.PAID;
  if (totalPaid > 0) return BILL_STATUS.PARTIAL;
  if (dueDate) {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return BILL_STATUS.OVERDUE;
  }
  return BILL_STATUS.AWAITING;
}

function CreateInvoiceView({ initialPatient, onClearInitial }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [pendingBillsResults, setPendingBillsResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showAddOnsSection, setShowAddOnsSection] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [items, setItems] = useState([emptyItem()]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [roundOff, setRoundOff] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [payments, setPayments] = useState([]);
  const [savedBill, setSavedBill] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [paymentCompleteFlash, setPaymentCompleteFlash] = useState(false);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(null);
  const [paymentFailureModal, setPaymentFailureModal] = useState(null);
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [issueDate] = useState(() => new Date().toISOString().slice(0, 10));

  const admissionStatus = selectedPatient ? getAdmissionStatus(selectedPatient.uhid) : null;

  const itemTotals = useMemo(() => {
    return items.map((row) => {
      const net = row.quantity * row.unitPrice - (row.itemDiscount || 0);
      const tax = taxInclusive ? 0 : (net * (row.taxPercent || 0)) / 100;
      const itemTotal = taxInclusive ? net : net + tax;
      return { ...row, net, tax, itemTotal };
    });
  }, [items, taxInclusive]);

  const subtotal = useMemo(() => itemTotals.reduce((s, r) => s + r.itemTotal, 0), [itemTotals]);
  const totalTax = useMemo(() => itemTotals.reduce((s, r) => s + r.tax, 0), [itemTotals]);
  const afterDiscount = Math.max(0, subtotal - (globalDiscount || 0));
  const grandTotalBeforeRound = afterDiscount;
  const grandTotal = Math.round((grandTotalBeforeRound + (roundOff || 0)) * 100) / 100;
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + (p.amount || 0), 0), [payments]);
  const dueAmount = Math.max(0, grandTotal - totalPaid);
  const billStatus = getBillStatus(grandTotal, totalPaid, dueDate, isFinalized);

  // Keep payment amount in sync with due amount so it shows Grand Total / Due by default
  useEffect(() => {
    setPaymentAmount(dueAmount);
  }, [dueAmount]);
  const invoiceNumber = savedBill?.invoice_number || savedBill?.invoiceNumber || generateInvoiceNumber();
  const currentUser = localStorage.getItem("swastik_username") || "billing";
  const simulatedIp = "192.168.1.1";

  const addPayment = useCallback((entry) => {
    const amount = entry.amount ?? paymentAmount;
    const paymentStatus =
      grandTotal > 0 && totalPaid + amount >= grandTotal ? "Completed" : entry.status || "Completed";
    const newPayment = {
      id: `pay-${Date.now()}`,
      date: entry.paymentDate || new Date().toISOString().slice(0, 10),
      method: entry.method || paymentMethod,
      reference: entry.transaction_reference || entry.reference || paymentNotes,
      amount,
      status: paymentStatus,
      createdBy: currentUser,
      timestamp: new Date().toISOString(),
      ip: simulatedIp,
      transactionId: entry.transactionId,
      receiptNumber: entry.receiptNumber,
    };
    setPayments((prev) => [...prev, newPayment]);
    setPaymentAmount(0);
    setPaymentNotes("");
    if (grandTotal > 0 && totalPaid + amount >= grandTotal) setPaymentCompleteFlash(true);
  }, [paymentMethod, paymentAmount, paymentNotes, grandTotal, totalPaid, currentUser]);

  const removePayment = useCallback((id) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (!paymentCompleteFlash) return;
    const t = setTimeout(() => setPaymentCompleteFlash(false), 2000);
    return () => clearTimeout(t);
  }, [paymentCompleteFlash]);

  useEffect(() => {
    if (!dirty || !selectedPatient) return;
    const t = setInterval(() => {
      setSavedBill((b) => (b ? { ...b, draft: true, lastAutoSave: new Date().toISOString() } : { draft: true, patientName: selectedPatient.fullName, uhid: selectedPatient.uhid, lastAutoSave: new Date().toISOString() }));
    }, 20000);
    return () => clearInterval(t);
  }, [dirty, selectedPatient]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirty && !isFinalized) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    loadRazorpayScript();
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, isFinalized]);

  useEffect(() => {
    if (initialPatient) {
      handleSelectPatient(initialPatient);
      if (onClearInitial) onClearInitial();
    }
  }, [initialPatient, onClearInitial]);

  const handleSearch = async () => {
    const q = (searchQuery || "").trim();
    if (!q) {
      setPatientSearchResults(searchPatients(q));
      setPendingBillsResults([]);
      return;
    }
    setSearching(true);
    setPendingBillsResults([]);
    setPatientSearchResults([]);
    try {
      const bills = await api.searchBills(q, 0, 50);
      const list = Array.isArray(bills) ? bills : [];
      const pending = list.filter((b) => (Number(b.due_amount) || 0) > 0);
      setPendingBillsResults(pending);
      if (pending.length === 0) {
        setPatientSearchResults(searchPatients(q));
      }
    } catch {
      setPatientSearchResults(searchPatients(q));
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPendingBill = (bill) => {
    const patient = {
      uhid: bill.uhid || bill.patient_id,
      fullName: bill.patient_name || "",
      contact: "",
      visitType: "OPD",
    };
    setSelectedPatient(patient);
    setSavedBill(bill);
    setPendingBillsResults([]);
    setPatientSearchResults([]);
    setSearchQuery("");
    setShowAddOnsSection(false);
    const billSubtotal = Number(bill.subtotal) || 0;
    const billTax = Number(bill.tax) || 0;
    const billDiscount = Number(bill.discount) || 0;
    const billTotal = Number(bill.total) || 0;
    const billDue = Number(bill.due_amount) || 0;
    setGlobalDiscount(billDiscount);
    setRoundOff(0);

    // 5% tax on due amount – added as a line item so summary and Amount (₹) show total with tax
    const tax5Percent = Math.round(billDue * 0.05 * 100) / 100;
    const taxLineItem = {
      ...emptyItem(),
      id: `item-${bill.id || "bill"}-tax5`,
      itemName: "Tax (5%)",
      category: "Consultation",
      quantity: 1,
      unitPrice: tax5Percent,
      taxPercent: 0,
      itemDiscount: 0,
    };

    const billItems = bill.items || [];
    let rows = [];
    if (billItems.length > 0) {
      rows = billItems.map((it, i) => {
        const qty = Number(it.quantity) || 1;
        const price = Number(it.price ?? it.unitPrice ?? it.amount) || 0;
        const taxAmt = Number(it.tax) || 0;
        const net = qty * price;
        const taxPercent = net > 0 ? (100 * taxAmt / net) : 0;
        return {
          id: `item-${bill.id || "bill"}-${i}`,
          category: it.category || "Consultation",
          itemName: it.item_name || it.itemName || it.description || "",
          quantity: qty,
          unitPrice: price,
          taxPercent: Math.round(taxPercent * 100) / 100,
          itemDiscount: 0,
        };
      });
    } else {
      const subtotalVal = billSubtotal || billTotal;
      const taxPct = subtotalVal > 0 ? (100 * billTax / subtotalVal) : 0;
      rows = [
        {
          ...emptyItem(),
          id: `item-${bill.id || "bill"}-0`,
          itemName: "Outstanding balance",
          category: "Consultation",
          unitPrice: subtotalVal,
          quantity: 1,
          taxPercent: Math.round(taxPct * 100) / 100,
          itemDiscount: 0,
        },
      ];
    }
    setItems([...rows, taxLineItem]);

    const existingPayments = (bill.payments || []).map((p, i) => ({
      id: `pay-${bill.id}-${i}`,
      date: (p.payment_date || "").slice(0, 10),
      method: p.method || "Cash",
      reference: p.transaction_reference || "",
      amount: Number(p.amount) || 0,
      status: "Completed",
      createdBy: p.created_by || currentUser,
      timestamp: p.payment_date || "",
    }));
    setPayments(existingPayments);
    // Total with 5% tax – will also be set by useEffect from dueAmount; set here so Amount (₹) shows it immediately
    setPaymentAmount(Math.round((billDue + tax5Percent) * 100) / 100);
    setDirty(true);
  };

  const handleSelectPatient = async (p) => {
    setSelectedPatient(p);
    setPatientSearchResults([]);
    setSearchQuery("");

    // Auto-search for pending bills for this patient
    setSearching(true);
    try {
      const bills = await api.searchBills(p.uhid, 0, 50);
      setPendingBillsResults(Array.isArray(bills) ? bills : []);
    } catch {
      setPendingBillsResults([]);
    } finally {
      setSearching(false);
    }

    setShowAddOnsSection(true);
    const visitType = (p.visitType || "opd").toLowerCase();
    const defaults = getDefaultItemsForVisitType(visitType);
    setItems(defaults.length ? defaults.map((d, i) => ({ ...emptyItem(), ...d, taxPercent: 5, id: `item-${Date.now()}-${i}` })) : [emptyItem()]);
    setSavedBill(null);
    setPayments([]);
    setDirty(true);
  };

  const refreshLoadedBill = useCallback(async () => {
    if (!savedBill?.id) return;
    try {
      const updated = await api.getBill(savedBill.id);
      if (!updated) return;
      setSavedBill(updated);
      const existingPayments = (updated.payments || []).map((p, i) => ({
        id: `pay-${updated.id}-${i}`,
        date: (p.payment_date || "").slice(0, 10),
        method: p.method || "Cash",
        reference: p.transaction_reference || "",
        amount: Number(p.amount) || 0,
        status: "Completed",
        createdBy: p.created_by || currentUser,
        timestamp: p.payment_date || "",
      }));
      setPayments(existingPayments);
      setPaymentAmount(Number(updated.due_amount) || 0);
    } catch (e) {
      console.error("Refresh bill failed", e);
    }
  }, [savedBill?.id, currentUser]);

  const addRow = () => { setItems((prev) => [...prev, emptyItem()]); setDirty(true); };
  const removeRow = (id) => { setItems((prev) => prev.filter((r) => r.id !== id)); setDirty(true); };
  const updateItem = (id, field, value) => {
    setDirty(true);
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, [field]: ["quantity", "unitPrice", "taxPercent", "itemDiscount"].includes(field) ? (typeof value === "string" ? parseFloat(value) || 0 : value) : value }
          : r
      )
    );
  };

  const handleSaveDraft = () => {
    if (!selectedPatient) return;
    setApiError(null);
    setSavedBill({ draft: true, patientName: selectedPatient.fullName, uhid: selectedPatient.uhid, invoice_number: invoiceNumber });
    setDirty(false);
  };

  const handleMarkPaid = async () => {
    if (!selectedPatient) return;
    setApiError(null);
    if (savedBill?.id) {
      try {
        const amount = Number(paymentAmount) || 0;
        if (amount > 0) {
          await api.addBillPayment(savedBill.id, {
            amount,
            method: paymentMethod,
            transaction_reference: paymentNotes || "",
            created_by: currentUser,
          });
        }
        await refreshLoadedBill();
        setIsFinalized(true);
        setDirty(false);
        setPaymentCompleteFlash(true);
      } catch (err) {
        setApiError(err?.message || "Failed to record payment");
      }
      return;
    }
    const createdBy = currentUser;
    const itemsForApi = itemTotals.map((r) => ({
      category: r.category,
      item_name: r.itemName,
      quantity: r.quantity,
      price: r.unitPrice,
      tax: r.tax,
      total: r.itemTotal,
    }));
    const payload = {
      patient_id: selectedPatient.uhid,
      uhid: selectedPatient.uhid,
      patient_name: selectedPatient.fullName,
      visit_id: null,
      admission_id: null,
      subtotal,
      tax: totalTax,
      discount: globalDiscount || 0,
      total: grandTotal,
      items: itemsForApi,
      created_by: createdBy,
    };
    try {
      let bill = await api.createBill(payload);
      for (const p of payments) {
        bill = await api.addBillPayment(bill.id, {
          amount: p.amount,
          method: p.method,
          transaction_reference: p.reference || "",
          created_by: p.createdBy || createdBy,
        });
      }
      setSavedBill({ ...bill, patientName: selectedPatient.fullName, caseNumber: selectedPatient.caseNumber });
      setIsFinalized(true);
      setDirty(false);
    } catch (err) {
      setApiError(err?.message || "Failed to save bill");
    }
  };

  const handleRazorpayClick = async () => {
    if (isFinalized) return;
    setApiError(null);
    let bId = savedBill?.id || savedBill?._id;
    if (!bId) {
      if (!selectedPatient) {
        setApiError("Please select a patient first.");
        return;
      }
      try {
        bId = await ensureBillCreated();
        if (!bId) throw new Error("Could not create bill");
      } catch (err) {
        setApiError(err.message || "Please save the bill first.");
        return;
      }
    }
    setRazorpayModalOpen(true);
  };

  const handleAddNonUpiPayment = async () => {
    const amount = Number(paymentAmount) || 0;
    if (amount <= 0) return;
    if (paymentMethod === "Online (Razorpay)") {
      handleRazorpayClick();
      return;
    }
    if (savedBill?.id) {
      try {
        setApiError(null);
        const res = await api.addBillPayment(savedBill.id, {
          amount,
          method: paymentMethod,
          transaction_reference: paymentNotes || "",
          created_by: currentUser,
        });
        if (res && res.bill) {
          setSavedBill(res.bill);
          const existingPayments = (res.bill.payments || []).map((p, i) => ({
            id: `pay-${res.bill.id}-${i}`,
            date: (p.payment_date || "").slice(0, 10),
            method: p.method || "Cash",
            reference: p.transaction_reference || "",
            amount: Number(p.amount) || 0,
            status: "Completed",
            createdBy: p.created_by || currentUser,
            timestamp: p.payment_date || "",
          }));
          setPayments(existingPayments);
          setPaymentAmount(Number(res.bill.due_amount) || 0);
        } else {
          await refreshLoadedBill();
        }
        setPaymentNotes("");
        if (dueAmount <= amount) setPaymentCompleteFlash(true);
        if (res && res.receipt_number) {
          setPaymentSuccessModal({
            receipt_number: res.receipt_number,
            payment_date: res.payment_date,
            amount: res.amount,
            method: res.method,
            transaction_reference: res.transaction_reference || paymentNotes,
            patientName: selectedPatient?.fullName,
            uhid: selectedPatient?.uhid,
            invoice_number: savedBill?.invoice_number,
          });
        }
      } catch (err) {
        setApiError(err?.message || "Failed to add payment");
      }
      return;
    }
    addPayment({ amount, method: paymentMethod, transaction_reference: paymentNotes });
  };

  const handleRazorpayVerifySuccess = (res) => {
    if (res && res.success) {
      setPaymentSuccessModal({
        receipt_number: res.receipt_number,
        payment_date: res.bill?.payments?.[res.bill.payments.length - 1]?.payment_date || new Date().toISOString(),
        amount: res.bill?.payments?.[res.bill.payments.length - 1]?.amount || 0,
        method: "Razorpay",
        transaction_reference: res.bill?.payments?.[res.bill.payments.length - 1]?.transaction_reference || "",
        patientName: selectedPatient?.fullName,
        uhid: selectedPatient?.uhid,
        invoice_number: res.bill?.invoice_number || savedBill?.invoice_number,
      });
      setPayments(res.bill?.payments || []);
      setSavedBill(res.bill);
      setPaymentAmount(Number(res.bill?.due_amount) || 0);
      setDirty(false);
    }
  };

  const handleRazorpayModalSuccess = useCallback(
    async (amount, options = {}) => {
      const method = options.method || "Online (Razorpay)";
      const transactionReference = (options.transactionReference || "").trim();
      const bId = savedBill?.id || savedBill?._id;
      if (bId) {
        try {
          setApiError(null);
          const res = await api.addBillPayment(bId, {
            amount: Number(amount) || 0,
            method,
            transaction_reference: transactionReference,
          });
          if (res && res.success) {
            handleRazorpayVerifySuccess(res);
            return { success: true, receipt_number: res.receipt_number };
          }
          return { success: false };
        } catch (err) {
          setApiError(err?.message || "Failed to add payment");
          return { success: false };
        }
      }
      return { success: false };
    },
    [savedBill, selectedPatient]
  );

  const handleUpiPaymentConfirmed = (entry) => {
    addPayment(entry);
  };

  const ensureBillCreated = useCallback(async () => {
    if (savedBill?.id) return savedBill.id;
    if (!selectedPatient) return null;
    const payload = {
      patient_id: selectedPatient.uhid,
      uhid: selectedPatient.uhid,
      visit_id: null,
      admission_id: null,
      subtotal,
      tax: totalTax,
      discount: globalDiscount || 0,
      total: grandTotal,
      items: itemTotals.map((r) => ({
        category: r.category,
        item_name: r.itemName,
        quantity: r.quantity,
        price: r.unitPrice,
        tax: r.tax,
        total: r.itemTotal,
      })),
      created_by: currentUser,
    };
    const bill = await api.createBill(payload);
    setSavedBill({ ...bill, patientName: selectedPatient.fullName });
    return bill.id;
  }, [savedBill?.id, selectedPatient, subtotal, totalTax, globalDiscount, grandTotal, itemTotals, currentUser]);


  const getPrintLogoUrl = () => {
    if (typeof window === "undefined" || !window.location) return "";
    const path = hospitalLogo.startsWith("/") ? hospitalLogo : `/${hospitalLogo}`;
    return window.location.origin + path;
  };
  const printStyles = `
    body{font-family:Segoe UI,sans-serif;padding:24px;background:white;}
    .invoice-print table{border-collapse:collapse;width:100%;margin:16px 0;}
    .invoice-print th,.invoice-print td{border:1px solid #ddd;padding:8px;}
    .print-header{display:flex;align-items:center;gap:15px;margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;}
    .print-logo{width:70px;height:auto;}
    .print-header h1{margin:0;font-size:22px;font-weight:bold;}
    .print-header p{margin:0;font-size:14px;color:#475569;}
    .logo-watermark{position:fixed;top:40%;left:25%;opacity:0.05;width:300px;z-index:-1;}
    @media print{
      body{background:white !important;}
      .print-header{display:flex;align-items:center;gap:15px;margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;}
      .print-logo{width:70px;height:auto;}
      .print-header h1{margin:0;font-size:22px;font-weight:bold;}
      .print-header p{margin:0;font-size:14px;}
      .no-print{display:none !important;}
    }
  `;
  const buildInvoiceHtml = (logoUrl) => {
    const totalPaidCalc = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const due = grandTotal - totalPaidCalc;
    const rows = itemTotals.map((r) => `<tr><td>${r.itemName}</td><td>${r.category}</td><td>${r.quantity}</td><td>${(r.unitPrice ?? 0).toFixed(2)}</td><td>${r.taxPercent ?? ""}%</td><td>${(r.itemTotal ?? 0).toFixed(2)}</td></tr>`).join("");
    const header = logoUrl
      ? `<div class="print-header"><img src="${logoUrl}" alt="" class="print-logo" /><div><h1>Swastik Psychiatric Hospital</h1><p>GST: 27AABCU9603R1ZM</p></div></div>`
      : `<div class="print-header"><div><h1>Swastik Psychiatric Hospital</h1><p>GST: 27AABCU9603R1ZM</p></div></div>`;
    const watermark = logoUrl ? `<img src="${logoUrl}" alt="" class="logo-watermark" aria-hidden="true" />` : "";
    return `${watermark}<div class="invoice-print">${header}<p><strong>Invoice No:</strong> ${invoiceNumber}</p><p><strong>Patient:</strong> ${selectedPatient?.fullName} | UHID: ${selectedPatient?.uhid}</p><table><thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Tax %</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p>Subtotal: ₹${subtotal.toFixed(2)} | Tax: ₹${totalTax.toFixed(2)} | Discount: ₹${(globalDiscount || 0).toFixed(2)} | <strong>Grand Total: ₹${grandTotal.toFixed(2)}</strong></p><p>Paid: ₹${totalPaidCalc.toFixed(2)} | Due: ₹${due.toFixed(2)}</p><p><em>All psychiatric records are confidential.</em></p><p>Authorized signature: _________________________</p></div>`;
  };

  const buildPaymentReceiptHtml = (receipt, logoUrl) => {
    if (!receipt || !receipt.receipt_number) return "";
    const dateStr = receipt.payment_date ? new Date(receipt.payment_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : new Date().toLocaleString();
    const header = logoUrl
      ? `<div class="print-header"><img src="${logoUrl}" alt="" class="print-logo" /><div><h1>Swastik Hospital</h1><p>GST: 27AABCU9603R1ZM</p></div></div>`
      : `<div class="print-header"><div><h1>Swastik Hospital</h1><p>GST: 27AABCU9603R1ZM</p></div></div>`;
    return `
<div class="receipt-print">
  ${header}
  <h2 class="receipt-title">PAYMENT RECEIPT</h2>
  <table class="receipt-table">
    <tr><td><strong>Receipt No.</strong></td><td>${receipt.receipt_number}</td></tr>
    <tr><td><strong>Date &amp; Time</strong></td><td>${dateStr}</td></tr>
    <tr><td><strong>Patient Name</strong></td><td>${receipt.patientName || "—"}</td></tr>
    <tr><td><strong>UHID</strong></td><td>${receipt.uhid || "—"}</td></tr>
    <tr><td><strong>Invoice No.</strong></td><td>${receipt.invoice_number || "—"}</td></tr>
    <tr><td><strong>Amount Paid</strong></td><td>₹${Number(receipt.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>
    <tr><td><strong>Payment Method</strong></td><td>${receipt.method || "—"}</td></tr>
    <tr><td><strong>UTR / Transaction ID</strong></td><td>${receipt.transaction_reference || "—"}</td></tr>
  </table>
  <p class="receipt-footer">This is a computer-generated receipt and does not require a signature.</p>
  <p class="receipt-confidential">All psychiatric records are confidential. For hospital use only.</p>
</div>`;
  };

  const handlePrintReceipt = () => {
    if (!paymentSuccessModal || typeof paymentSuccessModal !== "object") return;
    const logoUrl = getPrintLogoUrl();
    const html = buildPaymentReceiptHtml(paymentSuccessModal, logoUrl);
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Payment Receipt - ${paymentSuccessModal.receipt_number}</title><style>${printStyles} .receipt-print{max-width:480px;margin:0 auto}.receipt-title{text-align:center;font-size:1.25rem;margin:16px 0;color:#0f766e}.receipt-table{width:100%;border-collapse:collapse;margin:16px 0}.receipt-table td{padding:8px 12px;border-bottom:1px solid #e2e8f0}.receipt-table td:first-child{width:45%;color:#64748b}.receipt-footer,.receipt-confidential{font-size:0.85rem;color:#64748b;margin-top:20px}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
    w.close();
  };

  const handlePrint = () => {
    const logoUrl = getPrintLogoUrl();
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Invoice</title><style>${printStyles}</style></head><body>${buildInvoiceHtml(logoUrl)}</body></html>`);
    w.document.close();
    w.print();
    w.close();
  };

  const statusClass = {
    [BILL_STATUS.DRAFT]: "create-invoice-status--draft",
    [BILL_STATUS.AWAITING]: "create-invoice-status--awaiting",
    [BILL_STATUS.PARTIAL]: "create-invoice-status--partial",
    [BILL_STATUS.PAID]: "create-invoice-status--paid",
    [BILL_STATUS.OVERDUE]: "create-invoice-status--overdue",
  };

  return (
    <div className="billing-content create-invoice-page">
      {paymentCompleteFlash && <div className="create-invoice-flash" aria-live="polite">Payment completed</div>}

      <div className="billing-card create-invoice-card">
        <div className="create-invoice-status-row">
          <span className="create-invoice-status-label">Invoice status</span>
          <span className={`create-invoice-status-badge ${statusClass[billStatus] || ""}`}>{billStatus}</span>
        </div>

        <h2 className="billing-card__heading">Create Invoice</h2>
        <div className="billing-form-row">
          <label>Patient</label>
          <div className="billing-search-row">
            <input type="text" placeholder="Search by patient name or UHID" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} disabled={isFinalized} />
            <button type="button" className="billing-btn billing-btn--primary" onClick={handleSearch} disabled={isFinalized || !searchQuery.trim()}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
          {pendingBillsResults.length > 0 && (
            <div className="billing-card create-invoice-pending-list">
              <h4 className="create-invoice-pending-title">Pending payments (click to load)</h4>
              <div className="billing-table-wrap">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Patient</th>
                      <th>UHID</th>
                      <th>Pending (₹)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBillsResults.map((b) => (
                      <tr key={b.id || b._id} className="create-invoice-pending-row" onClick={() => handleSelectPendingBill(b)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleSelectPendingBill(b)}>
                        <td>{b.invoice_number}</td>
                        <td>{b.patient_name}</td>
                        <td>{b.uhid || b.patient_id || "—"}</td>
                        <td><strong>₹{Number(b.due_amount || 0).toLocaleString()}</strong></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="billing-btn billing-btn--sm billing-btn--primary" onClick={() => handleSelectPendingBill(b)}>Select</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!searching && pendingBillsResults.length === 0 && patientSearchResults.length > 0 && (
            <div className="billing-dropdown">
              <p className="create-invoice-search-hint">No pending bills. Select patient to create new invoice:</p>
              {patientSearchResults.map((p) => (
                <button type="button" key={p.uhid} className="billing-dropdown-item" onClick={() => handleSelectPatient(p)}>{p.uhid} – {p.fullName} – {p.contact}</button>
              ))}
            </div>
          )}
          {selectedPatient && (
            <div className="billing-patient-info">
              <p><strong>UHID:</strong> {selectedPatient.uhid} | <strong>Name:</strong> {selectedPatient.fullName}</p>
              <p><strong>Visit:</strong> {selectedPatient.visitType || "OPD"} {selectedPatient.riskFlag && "| High Risk"} {admissionStatus && `| Admission: ${admissionStatus.status}`}</p>
              <p><strong>Issue date:</strong> {issueDate} | <strong>Due date:</strong> <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="create-invoice-date" disabled={isFinalized} /></p>
            </div>
          )}
        </div>

        <div className="billing-form-row">
          <label>Items</label>
          {savedBill?.id && !showAddOnsSection ? (
            <div className="create-invoice-addons-collapsed">
              <p className="create-invoice-addons-summary">
                Loaded bill: <strong>{savedBill.invoice_number}</strong> — Grand Total ₹{grandTotal.toFixed(2)}, Due ₹{dueAmount.toFixed(2)} (includes 5% tax).
              </p>
              <p className="create-invoice-addons-hint">Add extra charges (consultation, procedures, etc.) to this bill.</p>
              <button type="button" className="billing-btn billing-btn--primary create-invoice-addons-btn" onClick={() => setShowAddOnsSection(true)} disabled={isFinalized}>
                + Add ons (additional charges)
              </button>
            </div>
          ) : (
            <>
              {savedBill?.id && showAddOnsSection && (
                <div className="create-invoice-addons-toggle">
                  <button type="button" className="billing-btn billing-btn--secondary billing-btn--sm" onClick={() => setShowAddOnsSection(false)}>Hide add-ons section</button>
                </div>
              )}
              <div className="billing-table-wrap">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Unit Price (₹)</th>
                      <th>Tax %</th>
                      <th>Item Disc. (₹)</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemTotals.map((row) => (
                      <tr key={row.id}>
                        <td><input type="text" value={row.itemName} onChange={(e) => updateItem(row.id, "itemName", e.target.value)} placeholder="Item" disabled={isFinalized} /></td>
                        <td>
                          <select value={row.category} onChange={(e) => updateItem(row.id, "category", e.target.value)} disabled={isFinalized}>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td><input type="number" min={1} value={row.quantity} onChange={(e) => updateItem(row.id, "quantity", e.target.value)} disabled={isFinalized} /></td>
                        <td><input type="number" min={0} step={0.01} value={row.unitPrice} onChange={(e) => updateItem(row.id, "unitPrice", e.target.value)} disabled={isFinalized} /></td>
                        <td><input type="number" min={0} max={100} value={row.taxPercent} onChange={(e) => updateItem(row.id, "taxPercent", e.target.value)} disabled={isFinalized} /></td>
                        <td><input type="number" min={0} value={row.itemDiscount || 0} onChange={(e) => updateItem(row.id, "itemDiscount", e.target.value)} disabled={isFinalized} /></td>
                        <td className="billing-table__total">{row.itemTotal.toFixed(2)}</td>
                        <td>{!isFinalized && <button type="button" className="billing-btn billing-btn--danger billing-btn--sm" onClick={() => removeRow(row.id)}>Remove</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isFinalized && <button type="button" className="billing-btn billing-btn--secondary" onClick={addRow}>+ Add Item</button>}
            </>
          )}
        </div>

        <div className="billing-summary-inline create-invoice-totals">
          <div className="billing-summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="billing-summary-row"><span>Tax</span><span>₹{totalTax.toFixed(2)}</span></div>
          <div className="billing-summary-row">
            <span>Tax inclusive</span>
            <input type="checkbox" checked={taxInclusive} onChange={(e) => { setTaxInclusive(e.target.checked); setDirty(true); }} disabled={isFinalized} />
          </div>
          <div className="billing-summary-row">
            <span>Global discount (₹)</span>
            <input type="number" min={0} value={globalDiscount} onChange={(e) => { setGlobalDiscount(parseFloat(e.target.value) || 0); setDirty(true); }} style={{ width: "100px" }} disabled={isFinalized} />
          </div>
          <div className="billing-summary-row">
            <span>Round off (₹)</span>
            <input type="number" step={0.01} value={roundOff} onChange={(e) => { setRoundOff(parseFloat(e.target.value) || 0); setDirty(true); }} style={{ width: "100px" }} disabled={isFinalized} />
          </div>
          <div className="billing-summary-row billing-summary-row--grand"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
          <div className="billing-summary-row"><span>Total Paid</span><span>₹{totalPaid.toFixed(2)}</span></div>
          <div className="billing-summary-row"><span>Due</span><span>₹{dueAmount.toFixed(2)}</span></div>
        </div>

        <div className="create-invoice-payment-section">
          <h3 className="create-invoice-payment-title">Payment</h3>
          <div className="create-invoice-payment-card">
            {paymentMethod === "UPI" ? (
              <UPIPaymentPanel
                amount={dueAmount > 0 ? dueAmount : grandTotal}
                invoiceNumber={invoiceNumber}
                onPaymentConfirmed={handleUpiPaymentConfirmed}
                disabled={isFinalized}
              />
            ) : (
              <>
                <div className="billing-form-row">
                  <label>Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={isFinalized}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="billing-form-row">
                  <label>{paymentMethod === "Insurance" ? "Insurance amount (₹)" : "Amount (₹)"}</label>
                  <input type="number" min={0} step={0.01} value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} disabled={isFinalized} />
                </div>
                <div className="billing-form-row">
                  <label>Reference / Notes</label>
                  <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="UTR / reference" disabled={isFinalized} />
                </div>
                <button type="button" className="billing-btn billing-btn--secondary" onClick={handleAddNonUpiPayment} disabled={isFinalized}>Add Payment</button>
              </>
            )}
            <RazorpayModal
              open={razorpayModalOpen}
              onClose={() => setRazorpayModalOpen(false)}
              billAmount={paymentAmount > 0 ? paymentAmount : dueAmount}
              patientName={selectedPatient?.fullName}
              billId={savedBill?.id || savedBill?._id}
              onPaymentSuccess={handleRazorpayModalSuccess}
              onVerifySuccess={handleRazorpayVerifySuccess}
              disabled={isFinalized}
            />
          </div>

          {payments.length > 0 && (
            <div className="create-invoice-payment-history">
              <h4>Payment history</h4>
              <div className="billing-table-wrap">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Transaction ID</th>
                      <th>Status</th>
                      <th>User</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td>{p.method}</td>
                        <td>₹{(p.amount || 0).toFixed(2)}</td>
                        <td>{p.transactionId || p.reference || "—"}</td>
                        <td>{p.status}</td>
                        <td><span className="create-invoice-audit">{p.createdBy}</span> {p.timestamp && <span className="create-invoice-audit-time" title={p.timestamp}>•</span>}</td>
                        <td>{!isFinalized && <button type="button" className="billing-btn billing-btn--danger billing-btn--sm" onClick={() => removePayment(p.id)}>Remove</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {apiError && <p className="billing-payment__error">{apiError}</p>}
        <div className="billing-create-actions no-print">
          {!isFinalized && <button type="button" className="billing-btn billing-btn--secondary" onClick={handleSaveDraft}>Save Draft</button>}
          <button type="button" className="billing-btn billing-btn--secondary" onClick={() => setShowReceiptPreview(!showReceiptPreview)}>Receipt preview</button>
          <button type="button" className="billing-btn billing-btn--secondary" onClick={handlePrint}>Print</button>
          {!isFinalized && (
            <button
              type="button"
              className="billing-btn billing-btn--primary"
              onClick={handleMarkPaid}
              disabled={totalPaid >= grandTotal && grandTotal > 0}
            >
              Finalize & Mark Paid
            </button>
          )}
        </div>
        {showReceiptPreview && (
          <div className="create-invoice-receipt-preview" dangerouslySetInnerHTML={{ __html: buildInvoiceHtml(getPrintLogoUrl()) }} />
        )}
        {savedBill && <p className="billing-card__muted">Bill saved. {savedBill.invoice_number || savedBill.invoiceNumber || "Draft saved."} {savedBill.lastAutoSave && "(Auto-saved)"}</p>}
        {isFinalized && <p className="create-invoice-locked">Invoice locked.</p>}

        {paymentSuccessModal && (
          <div className="billing-modal-overlay" role="dialog" aria-modal="true">
            <div className="billing-modal billing-modal--success">
              <h3>Payment successful</h3>
              {typeof paymentSuccessModal === "object" ? (
                <>
                  <p>Receipt number: <strong>{paymentSuccessModal.receipt_number}</strong></p>
                  <p style={{ fontSize: "0.9rem", color: "#475569", marginTop: "8px" }}>
                    ₹{Number(paymentSuccessModal.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} via {paymentSuccessModal.method || "—"}
                    {paymentSuccessModal.transaction_reference && ` · UTR: ${paymentSuccessModal.transaction_reference}`}
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
                    <button type="button" className="billing-btn billing-btn--primary" onClick={handlePrintReceipt}>Print receipt</button>
                    <button type="button" className="billing-btn billing-btn--secondary" onClick={() => setPaymentSuccessModal(null)}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <p>Receipt: <strong>{paymentSuccessModal}</strong></p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <button type="button" className="billing-btn billing-btn--secondary" onClick={() => setPaymentSuccessModal(null)}>Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {paymentFailureModal && (
          <div className="billing-modal-overlay" role="dialog" aria-modal="true">
            <div className="billing-modal billing-modal--failure">
              <h3>Payment failed</h3>
              <p>{paymentFailureModal}</p>
              <button type="button" className="billing-btn billing-btn--primary" onClick={() => setPaymentFailureModal(null)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateInvoiceView;
