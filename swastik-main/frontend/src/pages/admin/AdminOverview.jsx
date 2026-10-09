import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api/service";
import "./AdminPages.css";
import jsPDF from "jspdf";
import "jspdf-autotable";

const KPIS = [
  { key: "patients", label: "Total Patients", icon: "👥", color: "#0d9488" },
  { key: "opd_today", label: "OPD Today", icon: "🏥", color: "#3b82f6" },
  { key: "ipd_active", label: "Active IPD", icon: "🛏️", color: "#f97316" },
  { key: "doctors", label: "Doctors", icon: "👨‍⚕️", color: "#8b5cf6" },
  { key: "lab_pending", label: "Lab Pending", icon: "🔬", color: "#eab308" },
  { key: "lab_today", label: "Lab Tests Today", icon: "🧪", color: "#06b6d4" },
  { key: "revenue_today", label: "Revenue Today", icon: "💰", color: "#10b981", isMoney: true },
  { key: "pending_amount", label: "Pending Dues", icon: "⏳", color: "#ef4444", isMoney: true, critical: true },
];

export default function AdminOverview() {
  const [stats, setStats] = useState({});
  const [billingStats, setBillingStats] = useState({});
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, p] = await Promise.all([
        api.getAdminStats().catch(() => ({})),
        api.getBillingStats().catch(() => ({})),
        api.getAdminLivePatients(6).catch(() => []),
      ]);
      setStats(s || {});
      setBillingStats(b || {});
      setRecentPatients(Array.isArray(p) ? p : []);
      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
    } catch (_) { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const fmt = (v) => Number(v || 0).toLocaleString("en-IN");

  const merged = {
    ...stats,
    revenue_today: billingStats.revenue_today ?? stats.revenue_today,
    pending_amount: billingStats.outstanding ?? stats.pending_amount,
  };

  const generatePDF = () => {
    if (loading) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Swastik Hospital – Overview Dashboard", 14, 22);
    doc.setFontSize(12);
    // KPI Table
    const kpiRows = KPIS.map(k => [k.label, k.isMoney ? `₹ ${fmt(merged[k.key])}` : fmt(merged[k.key])]);
    doc.autoTable({ startY: 30, head: [["Metric", "Value"]], body: kpiRows, theme: "grid", headStyles: { fillColor: [13, 148, 136] } });
    let y = doc.lastAutoTable.finalY + 10;
    // Recent Patients
    if (recentPatients.length) {
      const patientRows = recentPatients.map(p => [p.name, p.uhid, `${p.gender || "—"}, ${p.age || "—"}y`, p.phone || ""]);
      doc.autoTable({ startY: y, head: [["Name", "UHID", "Details", "Phone"]], body: patientRows, theme: "grid", headStyles: { fillColor: [13, 148, 136] } });
    }
    doc.save("hospital_overview.pdf");
  };

  return (
    <div className="admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <h1 className="admin-page__title">Hospital Overview</h1>
          <p className="admin-page__subtitle">
            {loading ? "Fetching live data…" : `Live data · ${lastRefresh} · Auto‑refresh 30s`}
          </p>
        </div>
        <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
        <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={generatePDF} disabled={loading}>
          Download PDF
        </button>
      </div>

      {/* KPI Grid */}
      <section className="admin-section">
        <h2 className="admin-section__title">Key Performance Indicators</h2>
        <div className="admin-kpi-grid">
          {KPIS.map(kpi => {
            const val = kpi.isMoney ? `₹ ${fmt(merged[kpi.key])}` : fmt(merged[kpi.key]);
            const isCritical = kpi.critical && Number(merged[kpi.key] || 0) > 0;
            return (
              <div key={kpi.key} className={`admin-kpi-card${isCritical ? " admin-kpi-card--critical" : ""}`}>
                <span className="admin-kpi-card__icon" style={{ background: `${kpi.color}18`, color: kpi.color }}>{kpi.icon}</span>
                <span className="admin-kpi-card__value" style={{ color: isCritical ? "#b91c1c" : "#1a2b3c" }}>{loading ? "—" : val}</span>
                <span className="admin-kpi-card__label">{kpi.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Patients */}
      <section className="admin-section">
        <h2 className="admin-section__title">🧑‍🤝‍🧑 Recent Patients</h2>
        {loading ? (
          <p className="admin-loading">Loading…</p>
        ) : recentPatients.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No patients found</p>
        ) : (
          recentPatients.map(p => (
            <div key={p._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "#1a2b3c" }}>{p.name}</p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontFamily: "monospace" }}>{p.uhid}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#52687a" }}>{p.gender || "—"}, {p.age || "—"}y</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>{p.phone || ""}</p>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
