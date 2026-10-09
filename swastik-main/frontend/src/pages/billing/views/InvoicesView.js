import React, { useState, useMemo, useEffect } from "react";
import { api } from "../../../api/service";

function InvoicesView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getBills(0, 500);
        if (!cancelled && Array.isArray(list)) setBills(list);
      } catch {
        if (!cancelled) setBills([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const normalized = useMemo(() => {
    return bills.map((inv) => {
      const total = Number(inv.total) || 0;
      const insurance = Number(inv.insurance_covered) || 0;
      const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const due = Math.max(0, total - insurance - paid);
      const status = due <= 0 ? "Paid" : (inv.status || "Pending");
      const issueDate = (inv.created_at || "").slice(0, 10);
      return {
        id: inv.id || inv._id,
        invoiceNumber: inv.invoice_number || inv.id,
        patientName: inv.patient_name || "—",
        uhid: inv.uhid || inv.patient_id || "—",
        issueDate: issueDate || "—",
        status,
        amount: total,
      };
    });
  }, [bills]);

  const filtered = useMemo(() => {
    let list = normalized;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (inv) =>
          String(inv.invoiceNumber).toLowerCase().includes(q) ||
          String(inv.patientName).toLowerCase().includes(q) ||
          String(inv.uhid).toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter((inv) => inv.status === statusFilter);
    }
    return list;
  }, [normalized, search, statusFilter]);

  return (
    <div className="billing-content">
      <div className="billing-card">
        <div className="billing-card__toolbar">
          <input
            type="text"
            className="billing-card__search"
            placeholder="Search by invoice #, patient, UHID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="billing-card__filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <div className="billing-table-wrap">
          {loading ? (
            <p className="billing-loading">Loading…</p>
          ) : (
          <table className="billing-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient</th>
                <th>UHID</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>No invoices. Data from live database.</td></tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{inv.patientName}</td>
                    <td>{inv.uhid}</td>
                    <td>{inv.issueDate}</td>
                    <td><span className={`status-badge status-badge--${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                    <td>₹{Number(inv.amount).toLocaleString()}</td>
                    <td>
                      <button type="button" className="billing-btn billing-btn--sm billing-btn--secondary">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoicesView;
