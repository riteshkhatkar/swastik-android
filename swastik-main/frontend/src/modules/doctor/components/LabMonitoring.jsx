import React, { useState, useMemo, useEffect } from "react";
import { api } from "../../../api/service";

const LAB_ORDER_STATUS_LABELS = {
  REQUESTED: "Requested",
  ACKNOWLEDGED: "Acknowledged",
  REFERRED_TO_LAB: "Referred to lab",
  RESULTS_ENTERED: "Results entered",
  CANCELLED: "Cancelled",
};

const TEST_TYPES = ["Serum level", "Thyroid", "Renal", "Liver", "CBC", "Other"];
const COMMON_TESTS = ["Lithium", "Valproate", "TSH", "Creatinine", "eGFR", "LFT", "FBC"];
const LITHIUM_THERAPEUTIC_MIN = 0.6;
const LITHIUM_THERAPEUTIC_MAX = 1.2;
const LITHIUM_BAR_MAX = 1.6;

function parseNum(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function getStatus(value, referenceRange, abnormal) {
  if (abnormal) return "abnormal";
  const num = parseNum(value);
  if (num == null || !referenceRange) return "normal";
  const ref = referenceRange.replace(/\s/g, "");
  const match = ref.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (!match) return "normal";
  const [, low, high] = match.map(Number);
  if (Number.isFinite(low) && Number.isFinite(high)) {
    if (num < low * 0.9 || num > high * 1.1) return "abnormal";
    if (num < low || num > high) return "borderline";
  }
  return "normal";
}

function LabMonitoring({
  uhid,
  admissionId,
  list = [],
  onRefresh,
  pharmacistNotes: initialPharmacistNotes,
  labOrders = [],
  onRefreshLabOrders,
  onSendToLab,
  referringRequestId,
  canEdit = true,
}) {
  const [testType, setTestType] = useState("");
  const [testName, setTestName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [abnormal, setAbnormal] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [lastLabRequest, setLastLabRequest] = useState(null);

  useEffect(() => {
    if (orderFormOpen && catalog.length === 0) {
      api.getLabCatalog().then((res) => setCatalog(Array.isArray(res) ? res : [])).catch(() => setCatalog([]));
    }
  }, [orderFormOpen, catalog.length]);

  const toggleTest = (idOrName) => {
    setSelectedTests((prev) =>
      prev.includes(idOrName) ? prev.filter((t) => t !== idOrName) : [...prev, idOrName]
    );
  };

  const handleOrderLabSubmit = async (e) => {
    e.preventDefault();
    if (!uhid || selectedTests.length === 0) return;
    setOrderSubmitting(true);
    setLastLabRequest(null);
    try {
      const created = await api.createLabTestRequest({
        patient_id: uhid,
        doctor_id: "",
        tests_ordered: selectedTests,
        clinical_notes: clinicalNotes,
        admission_id: admissionId || undefined,
      });
      setLastLabRequest(created);
      onRefreshLabOrders?.();
    } catch (err) {
      alert(err?.message || "Failed to order lab test");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const closeOrderForm = () => {
    setOrderFormOpen(false);
    setLastLabRequest(null);
    setSelectedTests([]);
    setClinicalNotes("");
  };

  const resetForm = () => {
    setTestType("");
    setTestName("");
    setValue("");
    setUnit("");
    setReferenceRange("");
    setAbnormal(false);
    setDueDate("");
    setResultDate("");
  };

  const handleAdd = async () => {
    if (!uhid || !admissionId) return;
    try {
      await api.addLabMonitoring(uhid, {
        admission_id: admissionId,
        test_type: testType || undefined,
        test_name: testName || undefined,
        value: value || undefined,
        unit: unit || undefined,
        reference_range: referenceRange || undefined,
        abnormal,
        due_date: dueDate || undefined,
        result_date: resultDate || undefined,
      });
      resetForm();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  const lithiumDueEntry = useMemo(() => {
    const withDue = list.filter((r) => (r.test_name || "").toLowerCase().includes("lithium") && r.due_date);
    if (withDue.length === 0) return null;
    const sorted = [...withDue].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const next = sorted.find((r) => new Date(r.due_date).setHours(0, 0, 0, 0) >= now);
    return next || sorted[sorted.length - 1];
  }, [list]);
  const nextLithiumDue = lithiumDueEntry?.due_date ? new Date(lithiumDueEntry.due_date) : null;
  const today = useMemo(() => new Date(), []);
  today.setHours(0, 0, 0, 0);

  let lithiumDueBadge = null;
  if (nextLithiumDue) {
    const due = new Date(nextLithiumDue);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) lithiumDueBadge = { label: "Overdue", className: "lab-badge lab-badge--overdue" };
    else if (diffDays <= 7) lithiumDueBadge = { label: "Due Soon", className: "lab-badge lab-badge--due-soon" };
    else lithiumDueBadge = { label: `Due ${nextLithiumDue.toLocaleDateString()}`, className: "lab-badge lab-badge--future" };
  }

  function getLithiumBar(value) {
    const v = parseNum(value);
    const pct = v != null ? Math.min(100, (v / LITHIUM_BAR_MAX) * 100) : 0;
    const status = v == null ? "empty" : v > LITHIUM_THERAPEUTIC_MAX ? "high" : v < LITHIUM_THERAPEUTIC_MIN ? "low" : "normal";
    return { pct, status };
  }

  const lastUpdated = useMemo(() => {
    const dates = list.map((r) => r.result_date || r.due_date).filter(Boolean);
    if (dates.length === 0) return null;
    const latest = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
    return latest.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }, [list]);

  return (
    <div className="doctor-emr-section doctor-lab-monitoring">
      <div className="lab-monitoring-card">
        <div className="lab-monitoring-card__header">
          <div className="lab-monitoring-card__title-row">
            <span className="lab-monitoring-card__icon" aria-hidden>
              📋
            </span>
            <h4 className="lab-monitoring-card__title">Monitoring & Lab Orders</h4>
            <button
              type="button"
              className="lab-monitoring-card__collapse"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand section" : "Collapse section"}
            >
              {collapsed ? "▶" : "▼"}
            </button>
          </div>
          {lastUpdated && (
            <p className="lab-monitoring-card__updated">Last updated: {lastUpdated}</p>
          )}
        </div>

        {!collapsed && (
          <>
            <div className="lab-orders-section">
              <div className="lab-orders-section__header">
                <h5 className="lab-orders-section__title">Lab test orders</h5>
                <button type="button" className="lab-btn lab-btn--primary" onClick={() => setOrderFormOpen(true)} disabled={!canEdit}>
                  Order Lab Test
                </button>
              </div>
              {orderFormOpen && (
                <div className="lab-order-form-wrap">
                  <h4 className="lab-order-form-title">Order Lab Test</h4>
                  {lastLabRequest ? (
                    <div className="lab-referral-followup">
                      <p><strong>Order created:</strong> {lastLabRequest.request_id}</p>
                      {lastLabRequest.status === "REFERRED_TO_LAB" && (
                        <p>Patient has been referred to the lab. Awaiting arrival.</p>
                      )}
                      {(lastLabRequest.status === "REQUESTED" || lastLabRequest.status === "ACKNOWLEDGED") && (
                        <button
                          type="button"
                          className="lab-btn lab-btn--primary"
                          disabled={referringRequestId != null || !canEdit}
                          onClick={() => onSendToLab?.(lastLabRequest.request_id)}
                        >
                          {referringRequestId === lastLabRequest.request_id ? "Sending…" : "Send Patient to Lab"}
                        </button>
                      )}
                      <div className="lab-order-form-actions">
                        <button type="button" className="lab-btn" onClick={() => { setLastLabRequest(null); setSelectedTests([]); setClinicalNotes(""); }}>New order</button>
                        <button type="button" className="lab-btn" onClick={closeOrderForm}>Close</button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleOrderLabSubmit}>
                      <p className="lab-order-form-label">Select tests:</p>
                      <div className="lab-order-form-catalog">
                        {catalog.map((t) => (
                          <label key={t.id || t.test_name} className="lab-order-form-check">
                            <input type="checkbox" checked={selectedTests.includes(t.test_name || t.id)} onChange={() => canEdit && toggleTest(t.test_name || t.id)} disabled={!canEdit} />
                            <span>{t.test_name} ({t.category})</span>
                          </label>
                        ))}
                      </div>
                      <label className="lab-order-form-label">Clinical notes (optional)</label>
                      <textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={2} className="lab-order-form-notes" disabled={!canEdit} />
                      <div className="lab-order-form-actions">
                        <button type="submit" className="lab-btn lab-btn--primary" disabled={selectedTests.length === 0 || orderSubmitting || !canEdit}>
                          {orderSubmitting ? "Submitting…" : "Submit order"}
                        </button>
                        <button type="button" className="lab-btn" onClick={closeOrderForm}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
              {labOrders.length === 0 ? (
                <p className="lab-orders-section__empty">No lab orders yet. Click &quot;Order Lab Test&quot; to add tests.</p>
              ) : (
                <>
                  <h5 className="lab-referral-status-title">Lab referral status</h5>
                  <ul className="lab-orders-list">
                  {labOrders.slice(0, 10).map((r) => (
                    <li key={r.request_id} className="lab-orders-list__item">
                      <span className="lab-orders-list__id">{r.request_id}</span>
                      <span className={`lab-orders-list__status lab-orders-list__status--${(r.status || "").toLowerCase().replace(/_/g, "-")}`}>
                        {LAB_ORDER_STATUS_LABELS[r.status] || r.status}
                      </span>
                      {r.status === "REFERRED_TO_LAB" && (
                        <span className="lab-orders-list__hint">Referred to lab.</span>
                      )}
                      {(r.status === "REQUESTED" || r.status === "ACKNOWLEDGED") && (
                        <button
                          type="button"
                          className="lab-btn lab-btn--primary lab-orders-list__send"
                          disabled={referringRequestId != null || !canEdit}
                          onClick={() => onSendToLab?.(r.request_id)}
                        >
                          {referringRequestId === r.request_id ? "Sending…" : "Send Patient to Lab"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                </>
              )}
            </div>

            <div className="lab-monitoring-grid">
              {list.map((row) => {
                const isLithium = (row.test_name || "").toLowerCase().includes("lithium");
                const isThyroid = (row.test_name || "").toLowerCase().includes("tsh") || (row.test_type || "").toLowerCase().includes("thyroid");
                const isRenal = (row.test_name || "").toLowerCase().match(/creatinine|egfr|renal/) || (row.test_type || "").toLowerCase().includes("renal");
                const status = getStatus(row.value, row.reference_range, row.abnormal);

                return (
                  <div key={row.id} className="lab-value-card">
                    <div className="lab-value-card__header">
                      <span className="lab-value-card__label">{row.test_name || row.test_type || "—"}</span>
                      {(isThyroid || isRenal) && (
                        <span className={`lab-value-card__pill lab-value-card__pill--${status}`}>
                          {status === "normal" ? "Normal" : status === "borderline" ? "Borderline" : "Abnormal"}
                        </span>
                      )}
                    </div>
                    <p className="lab-value-card__value">
                      {row.value ?? "—"} {row.unit ? <span className="lab-value-card__unit">{row.unit}</span> : null}
                    </p>
                    <p className="lab-value-card__subtext">
                      {row.reference_range ? `Ref: ${row.reference_range}` : ""}
                      {row.result_date ? ` · ${new Date(row.result_date).toLocaleDateString()}` : row.due_date ? ` · Due ${new Date(row.due_date).toLocaleDateString()}` : ""}
                    </p>
                    {isLithium && (() => {
                      const { pct, status } = getLithiumBar(row.value);
                      return (
                        <div className="lab-value-card__lithium">
                          <p className="lab-value-card__lithium-range">Therapeutic range: 0.6–1.2 mEq/L</p>
                          <div className="lab-lithium-bar">
                            <div
                              className={`lab-lithium-bar__fill lab-lithium-bar__fill--${status}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {lithiumDueBadge && (
                            <span className={lithiumDueBadge.className}>{lithiumDueBadge.label}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {admissionId && (
              <div className="lab-monitoring-form-wrap">
                <h5 className="lab-form-title">Add lab result</h5>
                <div className="doctor-form-grid">
                  <div className="doctor-form-group">
                    <label>Test type</label>
                    <select value={testType} onChange={(e) => setTestType(e.target.value)} disabled={!canEdit}>
                      <option value="">Select</option>
                      {TEST_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="doctor-form-group">
                    <label>Test name</label>
                    <input
                      type="text"
                      list="lab-test-list"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      placeholder="e.g. Lithium, TSH"
                      disabled={!canEdit}
                    />
                    <datalist id="lab-test-list">
                      {COMMON_TESTS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                  <div className="doctor-form-group">
                    <label>Value</label>
                    <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Result" disabled={!canEdit} />
                  </div>
                  <div className="doctor-form-group">
                    <label>Unit</label>
                    <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. mmol/L" disabled={!canEdit} />
                  </div>
                  <div className="doctor-form-group">
                    <label>Reference range</label>
                    <input type="text" value={referenceRange} onChange={(e) => setReferenceRange(e.target.value)} placeholder="e.g. 0.6-1.2" disabled={!canEdit} />
                  </div>
                  <div className="doctor-form-group">
                    <label>Due date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canEdit} />
                  </div>
                  <div className="doctor-form-group">
                    <label>Result date</label>
                    <input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} disabled={!canEdit} />
                  </div>
                  <div className="doctor-form-group" style={{ display: "flex", alignItems: "center", paddingTop: "1.5rem" }}>
                    <label className="doctor-checkbox">
                      <input type="checkbox" checked={abnormal} onChange={(e) => setAbnormal(e.target.checked)} disabled={!canEdit} />
                      Abnormal / Flag
                    </label>
                  </div>
                  <div className="doctor-form-group doctor-form-group--full" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button type="button" className="doctor-btn doctor-btn--primary" onClick={handleAdd} disabled={!canEdit}>
                      Add lab result
                    </button>
                    <button type="button" className="doctor-btn doctor-btn--secondary" onClick={() => {}} disabled={!canEdit}>
                      Order Repeat Test
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LabMonitoring;
