import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../../api/service";

function ClientsView({ onNavigateToInvoices, onNavigateToCreate }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("outstanding"); // outstanding | name | totalBilled

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

  const patients = useMemo(() => {
    const byUhid = {};
    bills.forEach((b) => {
      const uhid = b.uhid || b.patient_id || "—";
      if (!byUhid[uhid]) {
        byUhid[uhid] = { uhid, fullName: b.patient_name || "—", totalBilled: 0, totalPaid: 0 };
      }
      const total = Number(b.total) || 0;
      const insurance = Number(b.insurance_covered) || 0;
      const paid = (b.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const patientPayable = total - insurance;
      byUhid[uhid].totalBilled += patientPayable;
      byUhid[uhid].totalPaid += paid;
    });
    return Object.values(byUhid).map((p) => ({
      ...p,
      outstanding: Math.max(0, p.totalBilled - p.totalPaid),
    }));
  }, [bills]);

  const filtered = useMemo(() => {
    let list = patients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.uhid || "").toLowerCase().includes(q) ||
          (p.fullName || "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "name") return (a.fullName || "").localeCompare(b.fullName || "");
      if (sortBy === "totalBilled") return (b.totalBilled || 0) - (a.totalBilled || 0);
      return (b.outstanding || 0) - (a.outstanding || 0);
    });
    return sorted;
  }, [patients, search, sortBy]);

  const summary = useMemo(() => {
    const totalBilled = patients.reduce((s, p) => s + p.totalBilled, 0);
    const totalPaid = patients.reduce((s, p) => s + p.totalPaid, 0);
    const totalOutstanding = patients.reduce((s, p) => s + p.outstanding, 0);
    return { totalClients: patients.length, totalBilled, totalPaid, totalOutstanding };
  }, [patients]);

  return (
    <div className="billing-content">
      {/* Summary cards */}
      <div className="billing-clients-summary">
        <div className="billing-clients-summary__card">
          <span className="billing-clients-summary__value">{summary.totalClients}</span>
          <span className="billing-clients-summary__label">Patients with bills</span>
        </div>
        <div className="billing-clients-summary__card">
          <span className="billing-clients-summary__value">₹{(summary.totalBilled / 1e5).toFixed(1)}L</span>
          <span className="billing-clients-summary__label">Total Billed</span>
        </div>
        <div className="billing-clients-summary__card">
          <span className="billing-clients-summary__value">₹{(summary.totalPaid / 1e5).toFixed(1)}L</span>
          <span className="billing-clients-summary__label">Total Collected</span>
        </div>
        <div className="billing-clients-summary__card billing-clients-summary__card--outstanding">
          <span className="billing-clients-summary__value">₹{(summary.totalOutstanding / 1e5).toFixed(1)}L</span>
          <span className="billing-clients-summary__label">Outstanding</span>
        </div>
      </div>

      <div className="billing-card">
        <div className="billing-card__toolbar billing-card__toolbar--row">
          <h2 className="billing-card__heading">Clients (Patients) – Billing Summary</h2>
        </div>
        <p className="billing-card__subtitle">Per-patient totals from live database. Search by UHID or name; use actions to view invoices or collect payment.</p>
        <div className="billing-card__filters">
          <input
            type="text"
            className="billing-card__search"
            placeholder="Search by UHID or patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="billing-card__filter" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="outstanding">Sort: Outstanding (high first)</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="totalBilled">Sort: Total billed (high first)</option>
          </select>
        </div>
        <div className="billing-table-wrap">
          {loading ? (
            <p className="billing-loading">Loading…</p>
          ) : (
            <table className="billing-table">
              <thead>
                <tr>
                  <th>UHID</th>
                  <th>Name</th>
                  <th className="billing-table__num">Total Billed</th>
                  <th className="billing-table__num">Total Paid</th>
                  <th className="billing-table__num">Outstanding</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="billing-table__empty">
                      {patients.length === 0 ? "No patient billing data yet. Data from live database." : "No patients match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.uhid}>
                      <td><span className="billing-table__mono">{p.uhid}</span></td>
                      <td>{p.fullName}</td>
                      <td className="billing-table__num">₹{p.totalBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="billing-table__num">₹{p.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="billing-table__num">
                        <span className={p.outstanding > 0 ? "billing-table__outstanding" : ""}>
                          ₹{p.outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <div className="billing-clients-actions">
                          <button type="button" className="billing-btn billing-btn--sm billing-btn--secondary" onClick={() => onNavigateToInvoices(p)}>
                            Invoices
                          </button>
                          <button type="button" className="billing-btn billing-btn--sm billing-btn--primary" onClick={() => onNavigateToCreate(p)}>
                            Collect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 0 && (
          <p className="billing-card__footer">
            Showing {filtered.length} of {patients.length} patient(s)
          </p>
        )}
      </div>
    </div>
  );
}

export default ClientsView;
