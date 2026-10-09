import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api/service";
import "./AdminPages.css";

const STATUS_BADGE = {
  "requested": "admin-badge",
  "acknowledged": "admin-badge",
  "in-process": "admin-badge",
  "results-entered": "admin-badge admin-badge--success",
  "report-ready": "admin-badge admin-badge--success",
  "report-released": "admin-badge admin-badge--success",
  "critical": "admin-badge admin-badge--danger",
};

export default function AdminLabClinical() {
  const [labStats, setLabStats] = useState({});
  const [recentLab, setRecentLab] = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, live, alerts] = await Promise.all([
        api.getLabStats(true).catch(() => ({})),
        api.getAdminLiveLab(20).catch(() => []),
        api.getLabCriticalAlerts(false).catch(() => []),
      ]);
      setLabStats(stats || {});
      setRecentLab(Array.isArray(live) ? live : []);
      setCriticalAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (_) { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (v) => Number(v || 0).toLocaleString("en-IN");

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Lab &amp; Clinical Monitoring</h1>
      <p className="admin-page__subtitle">Live lab statistics, pending tests, and critical alerts from database.</p>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <section className="admin-section" style={{ borderColor: "#fca5a5", background: "#fff9f9" }}>
          <h2 className="admin-section__title" style={{ color: "#b91c1c" }}>⚠ Critical Alerts ({criticalAlerts.length})</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {criticalAlerts.slice(0, 10).map((a, i) => (
              <li key={i} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: "0.9rem", fontWeight: 500 }}>
                {a.message || a.test_name || "Critical lab result — review required"}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lab Stats KPIs */}
      <section className="admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 className="admin-section__title" style={{ margin: 0 }}>Today's Lab Metrics</h2>
          <button type="button" className="admin-btn admin-btn--sm admin-btn--primary" onClick={load}>↻ Refresh</button>
        </div>
        {loading ? <p className="admin-loading">Loading lab data…</p> : (
          <div className="admin-kpi-grid">
            {[
              { label: "Tests Requested Today", value: fmt(labStats.total_requests_today), icon: "🧪", color: "#3b82f6" },
              { label: "In Process", value: fmt(labStats.tests_in_process), icon: "⚙️", color: "#f97316" },
              { label: "Results Entered", value: fmt(labStats.results_entered), icon: "✅", color: "#10b981" },
              { label: "Critical Alerts", value: fmt(labStats.critical_alerts ?? criticalAlerts.length), icon: "🚨", color: "#ef4444", critical: Number(labStats.critical_alerts || criticalAlerts.length) > 0 },
              { label: "Avg Wait Time", value: `${labStats.average_wait_time_minutes || 0} min`, icon: "⏱️", color: "#8b5cf6" },
            ].map((kpi) => (
              <div key={kpi.label} className={`admin-kpi-card${kpi.critical ? " admin-kpi-card--critical" : ""}`}>
                <span className="admin-kpi-card__icon" style={{ background: `${kpi.color}18`, color: kpi.color }}>{kpi.icon}</span>
                <span className="admin-kpi-card__value" style={{ color: kpi.critical ? "#b91c1c" : "#1a2b3c" }}>{kpi.value}</span>
                <span className="admin-kpi-card__label">{kpi.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Lab Requests */}
      <section className="admin-section">
        <h2 className="admin-section__title">Recent Lab Requests</h2>
        {loading ? <p className="admin-loading">Loading…</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>UHID</th>
                  <th>Test</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLab.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>No lab records found</td></tr>
                  : recentLab.map(r => (
                    <tr key={r._id}>
                      <td><strong>{r.patient_name || "—"}</strong></td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{r.uhid || "—"}</td>
                      <td>{r.test_name || "—"}</td>
                      <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{r.doctor_name || "—"}</td>
                      <td><span className={STATUS_BADGE[r.status] || "admin-badge"}>{r.status || "—"}</span></td>
                      <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{(r.created_at || "").slice(0, 10)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
