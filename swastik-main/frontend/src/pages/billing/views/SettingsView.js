import React, { useState, useEffect } from "react";
import { api } from "../../../api/service";

const FIELDS = [
  { key: "hospital_name", label: "Hospital name", type: "text", placeholder: "e.g. Swastik Hospital" },
  { key: "default_tax_percent", label: "Default tax (%)", type: "number", min: 0, max: 100, step: 0.5 },
  { key: "upi_id", label: "UPI ID (for QR / receipts)", type: "text", placeholder: "your-vpa@bank" },
  { key: "upi_recipient_name", label: "UPI recipient name", type: "text", placeholder: "Display name on UPI" },
  { key: "currency", label: "Currency", type: "text", placeholder: "INR" },
  { key: "receipt_footer", label: "Receipt footer text", type: "textarea", placeholder: "Thank you message on receipts" },
];

function SettingsView() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getBillingSettings()
      .then((data) => {
        if (!cancelled) {
          setSettings(data);
          setForm({ ...data });
        }
      })
      .catch(() => {
        if (!cancelled) setSettings({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (key, value) => {
    if (key === "default_tax_percent") value = Math.max(0, Math.min(100, Number(value) || 0));
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    api.updateBillingSettings(form)
      .then((updated) => {
        setSettings(updated);
        setForm({ ...updated });
        setMessage({ type: "success", text: "Settings saved successfully." });
      })
      .catch((err) => {
        setMessage({ type: "error", text: err?.message || "Failed to save settings." });
      })
      .finally(() => setSaving(false));
  };

  const handleReset = () => {
    if (settings) setForm({ ...settings });
  };

  if (loading) {
    return (
      <div className="billing-content">
        <p className="billing-loading">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="billing-content">
      <div className="billing-card billing-card--settings">
        <div className="billing-card__toolbar billing-card__toolbar--row">
          <h2 className="billing-card__heading">Billing settings</h2>
        </div>
        <p className="billing-card__subtitle">
          Configure hospital name, tax, UPI details and receipt text. Stored in the database and used across billing and receipts.
        </p>

        {message && (
          <div className={`billing-settings-message billing-settings-message--${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        <form className="billing-settings-form" onSubmit={handleSubmit}>
          <div className="billing-settings-grid">
            {FIELDS.map((f) => (
              <div key={f.key} className="billing-settings-field">
                <label className="billing-settings-label" htmlFor={`setting-${f.key}`}>
                  {f.label}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    id={`setting-${f.key}`}
                    className="billing-settings-input billing-settings-input--area"
                    value={form[f.key] ?? ""}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                  />
                ) : (
                  <input
                    id={`setting-${f.key}`}
                    type={f.type}
                    className="billing-settings-input"
                    value={form[f.key] ?? ""}
                    onChange={(e) => handleChange(f.key, f.type === "number" ? e.target.value : e.target.value)}
                    placeholder={f.placeholder}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="billing-settings-actions">
            <button type="button" className="billing-btn billing-btn--secondary" onClick={handleReset} disabled={saving}>
              Reset
            </button>
            <button type="submit" className="billing-btn billing-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettingsView;
