import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../../api/service";

function formatMoney(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Number(n).toLocaleString()}`;
}

function DashboardView({ metrics, onRefresh }) {
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBills = useCallback(async () => {
    try {
      const list = await api.getBills(0, 10);
      setRecentBills(Array.isArray(list) ? list : []);
    } catch {
      setRecentBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      await loadBills();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadBills]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (onRefresh) await onRefresh();
    await loadBills();
    setRefreshing(false);
  }, [onRefresh, loadBills]);

  const m = metrics || {};
  const cards = [
    { key: "totalInvoices", value: m.totalInvoices ?? 0, icon: "invoices", title: "Total Invoices" },
    { key: "paid", value: m.paid ?? 0, icon: "paid", title: "Paid" },
    { key: "pending", value: m.pending ?? 0, icon: "pending", title: "Pending" },
    { key: "revenue", value: formatMoney(m.revenue ?? 0), icon: "revenue", title: "Amount received" },
    { key: "outstanding", value: formatMoney(m.outstanding ?? 0), icon: "outstanding", title: "Outstanding" },
  ];

  const iconSvg = {
    invoices: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    paid: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
    pending: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    revenue: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    outstanding: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>,
  };

  return (
    <div className="billing-content">
      <div className="billing-dashboard-toolbar">
        <h2 className="billing-dashboard-toolbar__title">Key Billing Statistics</h2>
        <button type="button" className="billing-btn billing-btn--secondary billing-btn--sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="metric-card-grid">
        {cards.map(({ key, value, icon, title }) => (
          <div key={key} className="metric-card">
            <div style={{ color: "var(--bill-primary)", marginBottom: "16px", background: "var(--bill-primary-light)", display: "inline-flex", padding: "12px", borderRadius: "12px", width: "fit-content", position: "relative", zIndex: 1 }}>
              {iconSvg[icon]}
            </div>
            <span className="metric-card__title">{title}</span>
            <span className="metric-card__value">{value}</span>
          </div>
        ))}
      </div>
      <div className="billing-card">
        <h2 className="billing-card__heading">Recent Invoices</h2>
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
              </tr>
            </thead>
            <tbody>
              {recentBills.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>No invoices yet. Data from live database.</td></tr>
              ) : (
                recentBills.map((inv) => {
                  const totalFromField = Number(inv.total) || 0;
                  const fromItems = (inv.items || []).reduce((s, i) => s + (Number(i.total) != null ? Number(i.total) : (Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);
                  const total = totalFromField > 0 ? totalFromField : fromItems;
                  const insurance = Number(inv.insurance_covered) || 0;
                  const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
                  const due = Math.max(0, total - insurance - paid);
                  const status = due <= 0 ? "Paid" : (inv.status || "Pending");
                  const issueDate = (inv.created_at || "").slice(0, 10);
                  const displayAmount = total > 0 ? total : (paid > 0 ? paid : total);
                  return (
                    <tr key={inv.id || inv._id}>
                      <td>{inv.invoice_number || inv.id}</td>
                      <td>{inv.patient_name || "—"}</td>
                      <td>{inv.uhid || inv.patient_id || "—"}</td>
                      <td>{issueDate || "—"}</td>
                      <td><span className={`status-badge status-badge--${String(status).toLowerCase()}`}>{status}</span></td>
                      <td>{formatMoney(displayAmount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
