import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api/service";
import "./AdminPages.css";

const defaultHealth = {
  server: "—",
  database: "—",
  api_time_ms: null,
  active_sessions: 0,
  storage_usage: "—",
  backup_status: "Last: —",
};

export default function AdminSystemHealth() {
  const [health, setHealth] = useState(defaultHealth);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSystemHealth();
      setHealth({
        server: data.server ?? "—",
        database: data.database ?? "—",
        api_time_ms: data.api_time_ms,
        active_sessions: data.active_sessions ?? 0,
        storage_usage: data.storage_usage ?? "—",
        backup_status: data.backup_status ?? "Last: —",
      });
      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
    } catch (err) {
      setHealth(defaultHealth);
      setToast(err?.message || "Failed to load system health.");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const t = setInterval(fetchHealth, 30000);
    return () => clearInterval(t);
  }, [fetchHealth]);

  const handleBackup = async () => {
    setBackupLoading(true);
    setToast("Triggering backup…");
    try {
      await api.triggerBackup();
      setToast("Manual backup triggered.");
      setTimeout(() => setToast(null), 3000);
      fetchHealth();
    } catch (err) {
      setToast(err?.message || "Backup request failed.");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setBackupLoading(false);
    }
  };

  const isOk = (v) => v === "Online" || v === "Connected";
  const apiTimeStr = health.api_time_ms != null ? `${health.api_time_ms} ms` : "—";

  return (
    <div className="admin-page admin-page--health">
      <div className="admin-page__header-row">
        <div>
          <h1 className="admin-page__title">System Health Monitoring</h1>
          <p className="admin-page__subtitle">
            {loading ? "Loading…" : `Server, database, API, sessions, backup. Last refresh: ${lastRefresh || "—"}`}
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--sm admin-btn--primary"
          onClick={fetchHealth}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>
      <section className="admin-section admin-health-section">
        <h2 className="admin-section__title">Status</h2>
        <div className="admin-health-grid">
          <div className="admin-health-card">
            <span className={`admin-health-card__value ${isOk(health.server) ? "admin-health-card__value--ok" : ""}`}>
              {health.server}
            </span>
            <span className="admin-health-card__label">Server</span>
          </div>
          <div className="admin-health-card">
            <span className={`admin-health-card__value ${isOk(health.database) ? "admin-health-card__value--ok" : ""}`}>
              {health.database}
            </span>
            <span className="admin-health-card__label">Database</span>
          </div>
          <div className="admin-health-card">
            <span className="admin-health-card__value">{apiTimeStr}</span>
            <span className="admin-health-card__label">API response time</span>
          </div>
          <div className="admin-health-card">
            <span className="admin-health-card__value">{health.active_sessions}</span>
            <span className="admin-health-card__label">Active sessions</span>
          </div>
          <div className="admin-health-card">
            <span className="admin-health-card__value">{health.storage_usage}</span>
            <span className="admin-health-card__label">Storage usage</span>
          </div>
          <div className="admin-health-card">
            <span className="admin-health-card__value">{health.backup_status}</span>
            <span className="admin-health-card__label">Backup status</span>
          </div>
        </div>
        <div className="admin-health-actions">
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleBackup}
            disabled={backupLoading}
          >
            {backupLoading ? "Triggering…" : "Manual Backup"}
          </button>
        </div>
      </section>
      {toast && <div className="admin-toast">{toast}</div>}
    </div>
  );
}
