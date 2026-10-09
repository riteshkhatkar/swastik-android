import React, { useState, useEffect } from "react";
import "./AdminPages.css";
import { api } from "../../api/service";

export default function AdminSystemConfig() {
  const [config, setConfig] = useState({
    consultation_fee: 500,
    lab_base_fee: 300,
    admission_deposit: 5000,
    work_start: "08:00",
    work_end: "20:00",
    default_lab_tat: 24,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getSystemConfig();
        if (data) {
          // Normalize data types for inputs
          setConfig({
            ...data,
            consultation_fee: String(data.consultation_fee),
            lab_base_fee: String(data.lab_base_fee),
            admission_deposit: String(data.admission_deposit),
            default_lab_tat: String(data.default_lab_tat),
          });
        }
      } catch (err) {
        console.error("Failed to load config", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      const payload = {
        consultation_fee: parseInt(config.consultation_fee, 10) || 0,
        lab_base_fee: parseInt(config.lab_base_fee, 10) || 0,
        admission_deposit: parseInt(config.admission_deposit, 10) || 0,
        work_start: config.work_start,
        work_end: config.work_end,
        default_lab_tat: parseInt(config.default_lab_tat, 10) || 0,
      };
      await api.updateSystemConfig(payload);
      setToast("Settings saved successfully.");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast(`Error saving settings: ${err.message}`);
      setTimeout(() => setToast(null), 5000);
    }
  };

  if (loading) return <div className="admin-page"><p className="admin-loading">Loading configuration…</p></div>;

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">System Configuration</h1>
      <p className="admin-page__subtitle">Configure hospital-wide pricing, working hours, and operational thresholds.</p>

      <section className="admin-section">
        <h2 className="admin-section__title">💰 Pricing Settings</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "0.85rem" }}>Consultation (Rs)</label>
            <input
              type="number"
              value={config.consultation_fee}
              onChange={(e) => setConfig((c) => ({ ...c, consultation_fee: e.target.value }))}
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "0.85rem" }}>Lab base (Rs)</label>
            <input
              type="number"
              value={config.lab_base_fee}
              onChange={(e) => setConfig((c) => ({ ...c, lab_base_fee: e.target.value }))}
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "0.85rem" }}>Admission deposit (Rs)</label>
            <input
              type="number"
              value={config.admission_deposit}
              onChange={(e) => setConfig((c) => ({ ...c, admission_deposit: e.target.value }))}
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">🕒 Working Hours & TAT</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "0.85rem" }}>Start Time</label>
            <input
              type="time"
              value={config.work_start}
              onChange={(e) => setConfig((c) => ({ ...c, work_start: e.target.value }))}
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "0.85rem" }}>End Time</label>
            <input
              type="time"
              value={config.work_end}
              onChange={(e) => setConfig((c) => ({ ...c, work_end: e.target.value }))}
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "0.85rem" }}>Default lab TAT (hrs)</label>
            <input
              type="number"
              value={config.default_lab_tat}
              onChange={(e) => setConfig((c) => ({ ...c, default_lab_tat: e.target.value }))}
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </section>

      <div style={{ marginTop: "30px", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
        <button type="button" className="admin-btn admin-btn--primary" onClick={handleSave}>
          Confirm & Save Settings
        </button>
      </div>

      {toast && <div className="admin-toast">{toast}</div>}
    </div>
  );
}
