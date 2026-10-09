import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "../../../api/service";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function PaymentsView() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.getBills(0, 500)
      .then((list) => setBills(Array.isArray(list) ? list : []))
      .catch(() => setBills([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const payments = useMemo(() => {
    const rows = [];
    bills.forEach((b) => {
      (b.payments || []).forEach((p) => {
        rows.push({
          id: `${b.id}-${(p.payment_date || "")}-${p.amount}-${(p.receipt_number || "")}`,
          date: p.payment_date || "",
          dateFormatted: formatDate(p.payment_date),
          invoiceNumber: b.invoice_number || b.id,
          billId: b.id,
          patientName: b.patient_name || "—",
          method: p.method || "—",
          amount: Number(p.amount) || 0,
          receiptNumber: p.receipt_number || "—",
          status: "Completed",
        });
      });
    });
    rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return rows;
  }, [bills]);

  const filtered = useMemo(() => {
    let list = payments;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.patientName || "").toLowerCase().includes(q) ||
          (p.invoiceNumber || "").toLowerCase().includes(q) ||
          (p.receiptNumber || "").toLowerCase().includes(q)
      );
    }
    if (methodFilter) {
      list = list.filter((p) => (p.method || "") === methodFilter);
    }
    return list;
  }, [payments, search, methodFilter]);

  const methods = useMemo(() => {
    const set = new Set(payments.map((p) => p.method).filter(Boolean));
    return Array.from(set).sort();
  }, [payments]);

  const totalAmount = useMemo(() => filtered.reduce((s, p) => s + p.amount, 0), [filtered]);

  return (
    <div className="billing-content">
      <div className="billing-card billing-card--payments">
        <div className="billing-card__toolbar billing-card__toolbar--row">
          <h2 className="billing-card__heading">Payment History</h2>
          <button type="button" className="billing-btn billing-btn--secondary billing-btn--sm" onClick={load} disabled={loading}>
            {loading ? "Syncing…" : "Refresh"}
          </button>
        </div>
        <p className="billing-card__subtitle">All payments from the database. Search by patient, invoice or receipt number.</p>
        <div className="billing-card__filters">
          <input
            type="text"
            className="billing-card__search"
            placeholder="Search by patient, invoice or receipt…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="billing-card__filter" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="">All methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="billing-table-wrap">
          {loading ? (
            <p className="billing-loading">Loading payments…</p>
          ) : (
            <table className="billing-table billing-table--payments">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt</th>
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Method</th>
                  <th className="billing-table__num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="billing-table__empty">
                      {payments.length === 0 ? "No payments in the database yet." : "No payments match your filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td>{p.dateFormatted}</td>
                      <td><span className="billing-table__mono">{p.receiptNumber}</span></td>
                      <td><span className="billing-table__mono">{p.invoiceNumber}</span></td>
                      <td>{p.patientName}</td>
                      <td><span className="billing-table__method">{p.method}</span></td>
                      <td className="billing-table__num">₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td><span className="status-badge status-badge--completed">{p.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 0 && (
          <p className="billing-card__footer">
            Showing {filtered.length} payment(s) · Total: ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    </div>
  );
}

export default PaymentsView;
