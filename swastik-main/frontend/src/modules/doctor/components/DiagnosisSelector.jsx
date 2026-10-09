import React, { useState, useMemo } from "react";
import icd11Data from "../../../data/icd11Codes.json";
// DSM-5 codes
import dsm5Data from "../../../data/dsm5Codes.json";

const SEVERITY_OPTIONS = ["Mild", "Moderate", "Severe", "In remission", "Unspecified"];
const SPECIFIER_OPTIONS = ["Single episode", "Recurrent", "With psychotic features", "With anxious distress", "Seasonal pattern", "Peripartum onset", "Unspecified"];

function DiagnosisSelector({ value = {}, onChange, disabled = false }) {
  const [system, setSystem] = useState(value.system || "icd11");
  const [search, setSearch] = useState("");
  const [primarySearch, setPrimarySearch] = useState("");
  const [secondarySearch, setSecondarySearch] = useState("");
  const [showSecondary, setShowSecondary] = useState(false);


  const dataset = system === "icd11" ? icd11Data : dsm5Data;

  const filteredPrimary = useMemo(() => {
    if (!primarySearch.trim()) return dataset.slice(0, 10);
    const q = primarySearch.toLowerCase();
    return dataset.filter(
      (d) =>
        (d.code || "").toLowerCase().includes(q) ||
        (d.title || "").toLowerCase().includes(q)
    );
  }, [dataset, primarySearch]);

  const filteredSecondary = useMemo(() => {
    if (!secondarySearch.trim()) return dataset.slice(0, 10);
    const q = secondarySearch.toLowerCase();
    return dataset.filter(
      (d) =>
        (d.code || "").toLowerCase().includes(q) ||
        (d.title || "").toLowerCase().includes(q)
    );
  }, [dataset, secondarySearch]);

  const primary = value.primary || null;
  const secondaryList = value.secondary || [];
  const severity = value.severity || "";
  const specifier = value.specifier || "";

  return (
    <div className="doctor-diagnosis">
      <h4 className="doctor-emr-subtitle">Diagnosis</h4>
      <div className="doctor-diagnosis-toggle">
        <button
          type="button"
          className={`doctor-toggle-btn ${system === "icd11" ? "doctor-toggle-btn--active" : ""}`}
          onClick={() => !disabled && setSystem("icd11")}
          disabled={disabled}
        >
          ICD-11
        </button>
        <button
          type="button"
          className={`doctor-toggle-btn ${system === "dsm5" ? "doctor-toggle-btn--active" : ""}`}
          onClick={() => !disabled && setSystem("dsm5")}
          disabled={disabled}
        >
          DSM-5
        </button>
      </div>
      <div className="doctor-diagnosis-search-container" style={{ position: 'relative' }}>
        <input
          type="text"
          className="doctor-diagnosis-search"
          placeholder="Search by code or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        {/* Autocomplete dropdown logic */}
        {search.trim().length > 0 && (
          <ul className="doctor-diagnosis-list" style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            maxHeight: '300px',
            overflowY: 'auto',
            background: 'white',
            border: '1px solid var(--doc-border)',
            boxShadow: 'var(--doc-shadow-md)',
            borderRadius: '0 0 var(--doc-radius-md) var(--doc-radius-md)'
          }}>
            {dataset
              .filter(d =>
                d.code.toLowerCase().includes(search.toLowerCase()) ||
                d.title.toLowerCase().includes(search.toLowerCase())
              )
              .slice(0, 50) // Limit to 50 for efficiency
              .map(d => (
                <li key={d.code} style={{ listStyle: 'none' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 15px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                    onClick={() => {
                      // Store code and auto-populate title
                      onChange({ ...value, system, primary: d });
                      setSearch(""); // Close dropdown
                    }}
                  >
                    <strong>{d.code}</strong> – {d.title}
                    <div style={{ fontSize: '0.75rem', color: 'var(--doc-text-muted)' }}>{d.category}</div>
                  </button>
                </li>
              ))
            }
            {dataset.filter(d =>
              d.code.toLowerCase().includes(search.toLowerCase()) ||
              d.title.toLowerCase().includes(search.toLowerCase())
            ).length === 0 && (
                <li style={{ padding: '10px 15px', color: 'var(--doc-text-muted)' }}>No matching diagnoses found</li>
              )}
          </ul>
        )}
      </div>

      <div className="doctor-form-group">
        <label>Primary diagnosis</label>
        {primary ? (
          <div className="doctor-diagnosis-badge doctor-diagnosis-badge--primary">
            [{primary.code}] {primary.title}
          </div>
        ) : (
          <p style={{ color: 'var(--doc-text-muted)', fontSize: '0.9rem' }}>None selected. Use the search field above.</p>
        )}
      </div>

      {/* Severity and Specifier fields are maintained unchanged */}

      <div className="doctor-form-row-inline">
        <div className="doctor-form-group">
          <label>Severity</label>
          <select
            value={severity}
            onChange={(e) => onChange({ ...value, severity: e.target.value })}
            disabled={disabled}
          >
            <option value="">Select</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="doctor-form-group">
          <label>Specifier</label>
          <select
            value={specifier}
            onChange={(e) => onChange({ ...value, specifier: e.target.value })}
            disabled={disabled}
          >
            <option value="">Select</option>
            {SPECIFIER_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="doctor-form-group">
        <label>
          <input
            type="checkbox"
            checked={showSecondary}
            onChange={(e) => setShowSecondary(e.target.checked)}
            disabled={disabled}
          />
          {" "}Add secondary diagnosis
        </label>
      </div>

      {showSecondary && (
        <>
          <input
            type="text"
            placeholder="Search secondary..."
            value={secondarySearch}
            onChange={(e) => setSecondarySearch(e.target.value)}
            disabled={disabled}
          />
          {secondarySearch && filteredSecondary.length > 0 && (
            <ul className="doctor-diagnosis-list">
              {filteredSecondary.slice(0, 8).map((d) => (
                <li key={d.code}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!secondaryList.some((s) => s.code === d.code)) {
                        onChange({ ...value, secondary: [...secondaryList, d] });
                        setSecondarySearch("");
                      }
                    }}
                  >
                    [{d.code}] {d.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {secondaryList.map((d) => (
            <div key={d.code} className="doctor-diagnosis-badge doctor-diagnosis-badge--secondary">
              [{d.code}] {d.title}
              <button
                type="button"
                className="doctor-diagnosis-remove"
                onClick={() => onChange({ ...value, secondary: secondaryList.filter((s) => s.code !== d.code) })}
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </>
      )}
      <div className="doctor-form-group doctor-form-group--full">
        <label>Clinical formulation (Bio-Psycho-Social)</label>
        <textarea
          value={value.formulation_bio_psycho_social ?? ""}
          onChange={(e) => onChange({ ...value, formulation_bio_psycho_social: e.target.value })}
          rows={4}
          placeholder="Describe biological, psychological, and social factors contributing to the condition..."
          className="doctor-emr-textarea"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default DiagnosisSelector;
