import React, { useState, useEffect } from "react";
import { api } from "../../api/service";
import { buildLabReportPrintHtml } from "../../utils/labReportPrint";
import hospitalLogo from "../../assets/swasstiklogo.png";
import "./LabReportModal.css";

const HOSPITAL_NAME = "Swastik Hospital";

function LabReportModal({ open, requestId, onClose, onSaved, generatedBy, showSaveAction = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !requestId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getLabReportData(requestId)
      .then((res) => {
        if (!cancelled) setData(res || { request: null, results: [] });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load report");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, requestId]);

  const handleSaveDraft = async () => {
    if (!requestId || !generatedBy) return;
    setSaving(true);
    try {
      await api.generateLabReport(requestId, generatedBy);
      onSaved?.();
      onClose?.();
    } catch (err) {
      alert(err?.message || "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const buildPrintHtml = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const logoUrl = hospitalLogo ? (hospitalLogo.startsWith("http") ? hospitalLogo : origin + (hospitalLogo.startsWith("/") ? hospitalLogo : "/" + hospitalLogo)) : "";
    return buildLabReportPrintHtml(data, requestId, logoUrl);
  };

  const handlePrintPdf = () => {
    const html = buildPrintHtml();
    if (!html) return;
    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow pop-ups to print the report.");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  if (!open) return null;

  const req = data?.request;
  const results = Array.isArray(data?.results) ? data.results : [];

  return (
    <div className="lab-report-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="lab-report-modal-title">
      <div className="lab-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lab-report-modal__header">
          <h2 id="lab-report-modal-title" className="lab-report-modal__title">Lab Report</h2>
          <button type="button" className="lab-report-modal__close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {loading && <p className="lab-report-modal__loading">Loading report…</p>}
        {error && <p className="lab-report-modal__error">{error}</p>}

        {!loading && !error && req && (
          <>
            <div className="lab-report-modal__report no-print">
              {/* 1. Report Header */}
              <div
                className="lab-report-modal__report-header"
                style={{
                  borderBottom: "3px solid #0891b2",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <img src={hospitalLogo} alt="" style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "contain" }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#0e7490", textTransform: "uppercase", letterSpacing: "-0.5px" }}>SWASTIK PATHOLOGY LAB</h3>
                    <p style={{ fontSize: "14px", color: "#0891b2", fontWeight: 700, margin: "4px 0 0", letterSpacing: "1px" }}>Accurate | Caring | Instant</p>
                    <p style={{ margin: "6px 0 0 0", fontSize: "9px", color: "#64748b", fontWeight: 500, maxWidth: "300px", lineHeight: 1.3 }}>
                      Plot No. 12, Swastik Complex, Sangli-Miraj Road, Sangli - 416410
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ color: "#64748b", fontSize: "9px", fontWeight: 500, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Contact</span>
                    <p style={{ margin: 0, fontSize: "11px", color: "#1e293b", fontWeight: 600 }}>0233-2345678 | 9876543210</p>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "9px", fontWeight: 500, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Email & Web</span>
                    <p style={{ margin: 0, fontSize: "11px", color: "#1e293b", fontWeight: 600 }}>lab@swastikhospital.com</p>
                    <p style={{ margin: 0, fontSize: "10px", color: "#0891b2", fontWeight: 600 }}>www.swastikhospital.com</p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#0e7490",
                  height: "32px",
                  margin: "0 -40px 25px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "11px",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                Pathology Laboratory Report
              </div>

              {/* 2. Patient Information Section */}
              <div
                style={{
                  display: "flex",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  marginBottom: "30px",
                  background: "#fbfcfd",
                  overflow: "hidden"
                }}
              >
                <div style={{ padding: "15px 20px", flex: "1.2", borderRight: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
                    {req.patient_name || "—"}
                  </div>
                  <div style={{ display: "flex", marginBottom: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", width: "100px", flexShrink: 0 }}>UHID / PID</span>
                    <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "11px" }}>: {req.uhid || "—"}</span>
                  </div>
                  <div style={{ display: "flex", marginBottom: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", width: "100px", flexShrink: 0 }}>Age / Sex</span>
                    <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "11px" }}>: {req.patient_age || "—"} / {req.patient_sex || req.sex || "—"}</span>
                  </div>
                </div>

                <div style={{ padding: "15px 20px", flex: "1", borderRight: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", marginBottom: "8px", marginTop: "5px" }}>
                    <span style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", width: "100px", flexShrink: 0 }}>Collected</span>
                    <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "11px" }}>: {req.collection_time || (req.collection_end_time ? new Date(req.collection_end_time).toLocaleString() : "—")}</span>
                  </div>
                  <div style={{ display: "flex", marginBottom: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", width: "100px", flexShrink: 0 }}>Registered</span>
                    <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "11px" }}>: {req.created_at ? new Date(req.created_at).toLocaleString() : "—"}</span>
                  </div>
                  <div style={{ display: "flex", marginBottom: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", width: "100px", flexShrink: 0 }}>Reported</span>
                    <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "11px" }}>: {req.report_generated_at ? new Date(req.report_generated_at).toLocaleString() : new Date().toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ padding: "15px 20px", flex: "0.8", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                   <div style={{ border: "1px dashed #cbd5e1", padding: "10px", textAlign: "center", color: "#94a3b8", fontSize: "9px", fontWeight: 600 }}>
                      <div style={{ marginBottom: "5px" }}>REQ ID: {requestId}</div>
                      <div style={{ background: "#fff", width: "100px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>[ BARCODE ]</div>
                   </div>
                   <div style={{ marginTop: "10px", fontSize: "10px", color: "#64748b", fontWeight: 600 }}>Ref Dr: <span style={{ color: "#0f172a" }}>{req.doctor_name || "—"}</span></div>
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  fontSize: "20px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#0f172a",
                  margin: "15px 0 25px",
                  letterSpacing: "2px",
                  position: "relative"
                }}
              >
                Internal Test Report
                <div style={{ width: "60px", height: "3px", background: "#0891b2", margin: "8px auto 0" }}></div>
              </div>

              {/* 4. Test Results Section */}
              <div className="lab-report-modal__table-wrap">
                <table className="lab-report-modal__table" style={{ border: "none" }}>
                  <thead style={{ background: "none" }}>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #0891b2" }}>
                      <th style={{ background: "none", color: "#0e7490", padding: "14px 12px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Investigation</th>
                      <th style={{ background: "none", color: "#0e7490", padding: "14px 12px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Result</th>
                      <th style={{ background: "none", color: "#0e7490", padding: "14px 12px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Reference Range</th>
                      <th style={{ background: "none", color: "#0e7490", padding: "14px 12px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.id || i} style={{ borderBottom: "1px solid #f1f5f9" }} className={r.is_abnormal || r.is_critical ? 'abnormal-row' : ''}>
                        <td style={{ padding: "14px 12px", fontSize: "11px" }}>{r.test_catalog_id || r.test_name || "—"}</td>
                        <td style={{ padding: "14px 12px", fontWeight: 700, fontSize: "11px", color: (r.is_abnormal || r.is_critical) ? '#be123c' : 'inherit' }}>
                          {r.value != null ? r.value : r.value_text || "—"}
                        </td>
                        <td style={{ padding: "14px 12px", fontSize: "11px" }}>{r.reference_range || "—"}</td>
                        <td style={{ padding: "14px 12px", fontSize: "11px" }}>{r.unit || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "20px", padding: "20px", background: "#f8fafc", borderRadius: "8px", borderLeft: "5px solid #0891b2" }}>
                <div style={{ fontWeight: 800, marginBottom: "10px", color: "#0e7490", fontSize: "12px", textTransform: "uppercase" }}>Clinical Interpretation & Remarks</div>
                <div style={{ color: "#475569", fontSize: "11px", lineHeight: "1.6" }}>
                  <p style={{ margin: 0 }}>• All the Pathological tests are performed on professional automated systems with strict internal and external quality controls.</p>
                  <p style={{ margin: "6px 0 0 0" }}>
                    • Results should be clinically correlated with patient history and other diagnostic findings by the treating physician.
                  </p>
                  <p style={{ margin: "6px 0 0 0" }}>
                    • In case of any disparity, a repeat sample may be processed for confirmation.
                  </p>
                </div>
              </div>

              <div style={{ textAlign: "center", margin: "50px 0", color: "#cbd5e1", fontWeight: 700, fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase" }}>
                *** End of Report ***
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "auto",
                  paddingTop: "60px",
                  paddingBottom: "20px",
                  textAlign: "center",
                }}
              >
                <div style={{ width: "30%" }}>
                  <div style={{ borderTop: "2px solid #1e293b", paddingTop: "12px" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "13px", marginBottom: "4px" }}>Technician</div>
                    <div style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>Medical Lab Tech (DMLT)</div>
                  </div>
                </div>
                <div style={{ width: "30%" }}>
                  <div style={{ borderTop: "2px solid #1e293b", paddingTop: "12px" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "13px", marginBottom: "4px" }}>Dr. Nikhil Chougule</div>
                    <div style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>Consultant Pathologist</div>
                  </div>
                </div>
                <div style={{ width: "30%" }}>
                  <div style={{ borderTop: "2px solid #1e293b", paddingTop: "12px" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "13px", marginBottom: "4px" }}>Dr. P. M. Chougule</div>
                    <div style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>Consultant Physician</div>
                  </div>
                </div>
              </div>

              {/* 7. Footer Section */}
              <div
                className="lab-report-modal__footer"
                style={{ borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", padding: "15px 0", fontSize: "10px", color: "#64748b", fontWeight: 500 }}
              >
                <p>This is an <strong>Electronically Generated Report</strong> and does not require a physical signature.</p>
                <p>Page <strong>1 of 1</strong></p>
              </div>
            </div>

            <div className="lab-report-modal__actions">
              {showSaveAction && (
                <button type="button" className="lab-btn lab-btn--primary" onClick={handleSaveDraft} disabled={saving}>
                  {saving ? "Saving…" : "Save draft"}
                </button>
              )}
              <button type="button" className="lab-btn lab-btn--secondary" onClick={handlePrintPdf} disabled={results.length === 0}>
                Print report in PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LabReportModal;
