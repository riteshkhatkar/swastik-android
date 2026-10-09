import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../api/service";
import "./AdminPages.css";

const MODULE_OPTIONS = ["", "Auth", "Lab", "Billing", "Clinical", "Admin", "Patient"];

const ACTION_SEVERITY = (action = "") => {
  const a = action.toLowerCase();
  if (a.includes("login")) return "login";
  if (a.includes("deactivat") || a.includes("delete") || a.includes("reset")) return "warning";
  if (a.includes("creat") || a.includes("add")) return "create";
  return "info";
};

const SEVERITY_STYLES = {
  login: { background: "#e0f2fe", color: "#0369a1", label: "LOGIN" },
  warning: { background: "#fef3c7", color: "#b45309", label: "ACTION" },
  create: { background: "#d1fae5", color: "#047857", label: "CREATE" },
  info: { background: "#f1f5f9", color: "#52687a", label: "INFO" },
};

export default function AdminAuditSecurity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filterModule) params.module = filterModule;
      if (filterUser) params.user = filterUser;
      const data = await api.getAdminLogs(params);
      setLogs(Array.isArray(data) ? data : []);
      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
    } catch (_) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filterModule, filterUser]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 15000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const filtered = logs.filter((log) => {
    if (filterDate && (log.timestamp || "").slice(0, 10) !== filterDate) return false;
    return true;
  });

  const loginCount = filtered.filter(l => (l.action || "").toLowerCase().includes("login")).length;
  const warningCount = filtered.filter(l => {
    const a = (l.action || "").toLowerCase();
    return a.includes("deactivat") || a.includes("reset") || a.includes("delete");
  }).length;

  return (
    <div className="admin-page">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 className="admin-page__title">Audit &amp; Security Logs</h1>
          <p className="admin-page__subtitle">
            {loading ? "Fetching logs…" : `${filtered.length} records · Refreshed at ${lastRefresh} · Auto-refreshes every 15s`}
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--sm admin-btn--primary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* Summary pills */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "6px 14px", borderRadius: 20, fontSize: "0.875rem", fontWeight: 600 }}>
          🔐 {loginCount} Login Events
        </span>
        <span style={{ background: warningCount > 0 ? "#fef3c7" : "#f1f5f9", color: warningCount > 0 ? "#b45309" : "#64748b", padding: "6px 14px", borderRadius: 20, fontSize: "0.875rem", fontWeight: 600 }}>
          ⚠ {warningCount} Admin Actions
        </span>
        <span style={{ background: "#f0fdf4", color: "#047857", padding: "6px 14px", borderRadius: 20, fontSize: "0.875rem", fontWeight: 600 }}>
          📊 {filtered.length} Total Records
        </span>
      </div>

      {/* Filters */}
      <section className="admin-section">
        <h2 className="admin-section__title">Filters</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="admin-input"
            style={{ width: "auto" }}
          />
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="admin-select"
            style={{ width: "auto" }}
          >
            {MODULE_OPTIONS.map(m => (
              <option key={m} value={m}>{m || "All Modules"}</option>
            ))}
          </select>
          <input
            className="admin-input"
            placeholder="Filter by username…"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            style={{ width: "auto", minWidth: 180 }}
          />
          {(filterDate || filterModule || filterUser) && (
            <button type="button" className="admin-btn admin-btn--sm" onClick={() => { setFilterDate(""); setFilterModule(""); setFilterUser(""); }}>
              ✕ Clear Filters
            </button>
          )}
        </div>
      </section>

      {/* Logs Table */}
      <section className="admin-section">
        <h2 className="admin-section__title">Activity Log</h2>
        {loading && logs.length === 0
          ? <p className="admin-loading">Loading audit logs…</p>
          : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>Type</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>No audit records found</td></tr>
                    : filtered.map((log, i) => {
                      const sev = ACTION_SEVERITY(log.action);
                      const style = SEVERITY_STYLES[sev];
                      return (
                        <tr key={log._id || i} style={sev === "warning" ? { background: "#fffbeb" } : sev === "login" ? { background: "#f0f9ff" } : {}}>
                          <td style={{ fontSize: "0.82rem", color: "#64748b", fontFamily: "monospace", whiteSpace: "nowrap" }}>{log.timestamp || "—"}</td>
                          <td><strong style={{ color: "#1a2b3c" }}>{log.user || "—"}</strong></td>
                          <td><span className="admin-badge">{log.module || "—"}</span></td>
                          <td style={{ fontSize: "0.9rem", color: "#334155", maxWidth: 300 }}>{log.action || "—"}</td>
                          <td>
                            <span style={{ background: style.background, color: style.color, padding: "3px 8px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
                              {style.label}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.82rem", fontFamily: "monospace", color: "#64748b" }}>{log.ip || "—"}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </div>
  );
}
