import React, { useState } from "react";
import { api } from "../../../api/service";
import { FiClock } from 'react-icons/fi';

const LATEST_VITAL_ITEMS = [
  { key: "hr", label: "HEART RATE", unit: "bpm", format: (v) => (v != null && v !== "" ? `${v}` : "—"), icon: "heart", altBg: true },
  { key: "bp", label: "BLOOD PRESSURE (MMHG)", unit: "", format: (r) => (r?.systolic != null || r?.diastolic != null ? `${r?.systolic ?? "—"}/${r?.diastolic ?? "—"}` : "—"), icon: "bp", altBg: false },
  { key: "temp", label: "TEMPERATURE", unit: "°C", format: (v) => (v != null && v !== "" ? `${v}` : "—"), icon: "temp", altBg: false },
  { key: "spo2", label: "SPO2", unit: "%", format: (v) => (v != null && v !== "" ? `${v}` : "—"), icon: "spo2", altBg: false },
  { key: "sleep", label: "SLEEP LAST NIGHT", unit: "hrs", format: (v) => (v != null && v !== "" ? `${v}` : "—"), icon: "sleep", altBg: true },
  { key: "weight", label: "WEIGHT", unit: "kg", format: (v) => (v != null && v !== "" ? `${v}` : "—"), icon: "weight", altBg: false },
];

const APPETITE_OPTIONS = ["Normal", "Reduced", "Poor", "None"];

function formatRecordedAt(recordedAt) {
  if (!recordedAt) return "—";
  try {
    const d = typeof recordedAt === "string" ? new Date(recordedAt) : recordedAt;
    if (isNaN(d.getTime())) return "—";
    const day = d.getDate();
    const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hrs = d.getHours();
    const mins = d.getMinutes();
    return `${day} ${month} ${year}, ${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  } catch {
    return "—";
  }
}

function getLatestVitalValue(latest, item) {
  if (item.key === "bp") {
    return { systolic: latest?.bp_systolic ?? latest?.bp, diastolic: latest?.bp_diastolic };
  }
  if (item.key === "sleep") return latest?.sleep_hours ?? latest?.sleep;
  return latest?.[item.key];
}

function Vitals({ value = {}, onChange, list = [], uhid, admissionId, onRefresh, canEdit = true }) {
  const [nursingNote, setNursingNote] = useState("");
  const [saving, setSaving] = useState(false);

  const latest = list && list.length > 0 ? list[0] : null;
  const recordedBy = latest?.recorded_by || "—";
  const recordedAtStr = formatRecordedAt(latest?.recorded_at);

  const handleFormChange = (field, val) => {
    onChange({ ...value, [field]: val });
  };

  const handleSaveVitals = async () => {
    if (!uhid || !admissionId) return;
    setSaving(true);
    try {
      const bpMatch = String(value.bp || "").match(/^\s*(\d+)\s*\/\s*(\d+)/);
      const payload = {
        admission_id: admissionId,
        bp_systolic: bpMatch ? parseInt(bpMatch[1], 10) : null,
        bp_diastolic: bpMatch ? parseInt(bpMatch[2], 10) : null,
        hr: value.hr ? parseInt(value.hr, 10) : null,
        temp: value.temp ? parseFloat(value.temp) : null,
        spo2: value.spo2 ? parseInt(value.spo2, 10) : null,
        weight: value.weight ? parseFloat(value.weight) : null,
        sleep_hours: value.sleep ? parseFloat(value.sleep) : null,
        appetite: value.appetite || null,
        agitation_score: value.agitation !== "" ? parseInt(value.agitation, 10) : null,
      };

      if (value.recordedAt) {
        payload.recorded_at = new Date(value.recordedAt).toISOString();
      }

      const recordedByUser = localStorage.getItem("swastik_username") || "Nurse";
      await api.addVitals(uhid, payload, recordedByUser);

      // Clear form
      onChange({});
      setNursingNote("");
      onRefresh?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doctor-vitals">
      {/* Latest Vitals */}
      <section className="doctor-vitals-latest">
        <div className="doctor-vitals-latest__header">
          <span className="doctor-vitals-latest__icon" aria-hidden />
          <div>
            <h4 className="doctor-vitals-latest__title">Latest Vitals – {recordedAtStr}</h4>
            <p className="doctor-vitals-latest__by">Recorded by {recordedBy}</p>
          </div>
        </div>
        <div className="doctor-vitals-latest__grid">
          {LATEST_VITAL_ITEMS.map((item) => {
            const raw = getLatestVitalValue(latest, item);
            const displayVal = item.key === "bp" ? item.format(raw) : item.format(raw);
            const displayUnit = item.key === "bp" ? "" : item.unit;
            return (
              <div
                key={item.key}
                className={`doctor-vitals-latest__card ${item.altBg ? "doctor-vitals-latest__card--alt" : ""}`}
              >
                <span className={`doctor-vitals-latest__card-icon doctor-vitals-latest__card-icon--${item.icon}`} aria-hidden />
                <p className="doctor-vitals-latest__card-value">
                  {displayVal === "—" ? displayVal : `${displayVal}${displayUnit ? ` ${displayUnit}` : ""}`}
                </p>
                <p className="doctor-vitals-latest__card-label">{item.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Record New Vitals */}
      <section className="doctor-vitals-record">
        <div className="doctor-vitals-record__header">
          <span className="doctor-vitals-record__icon" aria-hidden />
          <h4 className="doctor-vitals-record__title">Record New Vitals</h4>
          <span className="doctor-vitals-record__access">Nursing access</span>
        </div>
        <div className="doctor-vitals-record__grid">
          <div className="doctor-vitals-record__field">
            <label>BLOOD PRESSURE</label>
            <input
              type="text"
              placeholder="e.g. 120/80 mmHg"
              value={value.bp || ""}
              onChange={(e) => handleFormChange("bp", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="doctor-vitals-record__field">
            <label>HEART RATE (BPM)</label>
            <input
              type="number"
              placeholder="—"
              value={value.hr || ""}
              onChange={(e) => handleFormChange("hr", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="doctor-vitals-record__field">
            <label>TEMPERATURE (°C)</label>
            <input
              type="number"
              step="0.1"
              placeholder="—"
              value={value.temp || ""}
              onChange={(e) => handleFormChange("temp", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="doctor-vitals-record__field">
            <label>SPO2 (%)</label>
            <input
              type="number"
              placeholder="—"
              value={value.spo2 || ""}
              onChange={(e) => handleFormChange("spo2", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="doctor-vitals-record__field">
            <label>WEIGHT (KG)</label>
            <input
              type="number"
              step="0.1"
              placeholder="—"
              value={value.weight || ""}
              onChange={(e) => handleFormChange("weight", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="doctor-vitals-record__field">
            <label>SLEEP LAST NIGHT (HRS)</label>
            <input
              type="number"
              step="0.1"
              placeholder="—"
              value={value.sleep || ""}
              onChange={(e) => handleFormChange("sleep", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="doctor-vitals-record__field">
            <label>APPETITE</label>
            <select
              value={value.appetite || ""}
              onChange={(e) => handleFormChange("appetite", e.target.value)}
              disabled={!canEdit}
            >
              <option value="">—</option>
              {APPETITE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="doctor-vitals-record__field">
            <label>AGITATION SCORE (0-5)</label>
            <input
              type="number"
              min={0}
              max={5}
              placeholder="—"
              value={value.agitation || ""}
              onChange={(e) => handleFormChange("agitation", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="doctor-vitals-record__field">
            <label>DATE & TIME</label>
            <input
              type="datetime-local"
              value={value.recordedAt || ""}
              onChange={(e) => handleFormChange("recordedAt", e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="doctor-vitals-record__notes">
          <label>NURSING OBSERVATION NOTES</label>
          <textarea
            rows={4}
            placeholder="Describe patient behaviour, any incidents, medication administration..."
            value={nursingNote}
            onChange={(e) => setNursingNote(e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="doctor-vitals-record__actions">
          <button
            type="button"
            className="doctor-vitals-record__btn-save"
            onClick={handleSaveVitals}
            disabled={saving || !canEdit}
          >
            {saving ? "Saving…" : "Save Vitals"}
          </button>
        </div>
      </section>
      {/* Historical Vitals */}
      <section className="doctor-vitals-history" style={{ marginTop: '2rem' }}>
        <div className="doctor-vitals-record__header">
          <FiClock size={16} />
          <h4 className="doctor-vitals-record__title">Vitals History</h4>
        </div>
        <div className="doctor-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="doctor-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>BP</th>
                <th>HR</th>
                <th>Temp</th>
                <th>SpO2</th>
                <th>Sleep</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1rem' }}>No historical records available.</td></tr>
              ) : (
                list.map((v, idx) => (
                  <tr key={v._id || idx}>
                    <td>{formatRecordedAt(v.recorded_at)}</td>
                    <td>{v.bp_systolic != null ? `${v.bp_systolic}/${v.bp_diastolic}` : "—"}</td>
                    <td>{v.hr || "—"}</td>
                    <td>{v.temp ? `${v.temp}°C` : "—"}</td>
                    <td>{v.spo2 ? `${v.spo2}%` : "—"}</td>
                    <td>{v.sleep_hours || "—"}h</td>
                    <td><span style={{ fontSize: '0.8rem', color: '#64748b' }}>{v.recorded_by}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Vitals;
