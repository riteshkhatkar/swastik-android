import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/service";
import LabReportModal from "./LabReportModal";
import { FiCheckCircle, FiUserCheck, FiPlayCircle, FiCheck, FiActivity, FiEdit3, FiFilePlus, FiEye, FiSend, FiXCircle } from "react-icons/fi";

const STATUS_LABELS = {
  REQUESTED: "Requested",
  ACKNOWLEDGED: "Acknowledged",
  REFERRED_TO_LAB: "Referred to lab",
  PATIENT_ARRIVED_AT_LAB: "At lab",
  SAMPLE_COLLECTION_IN_PROCESS: "Sample in progress",
  SAMPLE_COLLECTED: "Sample collected",
  SAMPLE_RECEIVED_IN_LAB: "Sample received",
  TEST_IN_PROCESS: "Test in process",
  RESULTS_ENTERED: "Results entered",
  RESULTS_VERIFIED: "Results verified",
  REPORT_READY: "Report ready",
  REPORT_RELEASED: "Report released",
};

function LabDashboard() {
  const [stats, setStats] = useState({
    total_requests_today: 0,
    pending_sample_collection: 0,
    referred_waiting: 0,
    waiting_at_lab: 0,
    tests_in_process: 0,
    results_entered: 0,
    reports_ready_today: 0,
    critical_alerts: 0,
    average_wait_time_minutes: 0,
  });
  const [queue, setQueue] = useState([]);
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [toast, setToast] = useState(null);
  const [reportModalRequestId, setReportModalRequestId] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historySearchName, setHistorySearchName] = useState("");
  const [historySearchPatientId, setHistorySearchPatientId] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const navigate = useNavigate();
  const labUser = localStorage.getItem("swastik_lab_user") || "Lab Assistant";

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, queueRes, waitingRes, alertsRes, historyRes] = await Promise.all([
        api.getLabStats(true),
        api.getLabTestRequests({ today_only: true, limit: 100 }),
        api.getLabWaitingPatients(true),
        api.getLabCriticalAlerts(true),
        api.getLabTestRequests({ today_only: false, limit: 500 }),
      ]);
      setStats(statsRes || {});
      setQueue(Array.isArray(queueRes) ? queueRes : []);
      setWaitingPatients(Array.isArray(waitingRes) ? waitingRes : []);
      setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
      setHistoryList(Array.isArray(historyRes) ? historyRes : []);
    } catch (e) {
      setQueue([]);
      setWaitingPatients([]);
      setAlerts([]);
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const handleAcknowledge = async (requestId) => {
    setActioning(requestId);
    try {
      await api.acknowledgeLabRequest(requestId, labUser);
      await load();
    } catch (e) {
      alert(e.message || "Failed to acknowledge");
    } finally {
      setActioning(null);
    }
  };

  const handleStartSample = async (requestId) => {
    setActioning(requestId);
    try {
      await api.startLabSampleCollection(requestId, labUser);
      showToast("Sample collection started.");
      await load();
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setActioning(null);
    }
  };

  const handleCheckIn = async (requestId) => {
    setActioning(requestId);
    try {
      await api.checkInPatientAtLab(requestId, labUser);
      showToast("Patient checked in.");
      await load();
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setActioning(null);
    }
  };

  const handleCompleteSample = async (requestId) => {
    if (!window.confirm("Confirm: Sample collected for this patient? Barcode will be generated.")) return;
    setActioning(requestId);
    try {
      await api.completeLabSampleCollection(requestId, { sample_type: "blood", sample_condition: "good", collected_by: labUser });
      showToast("Sample collected.");
      await load();
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setActioning(null);
    }
  };

  const handleMarkNoShow = async (requestId) => {
    if (!window.confirm("Mark this patient as no-show? Doctor will be notified.")) return;
    setActioning(requestId);
    try {
      await api.markLabNoShow(requestId, labUser);
      showToast("Marked as no-show.");
      await load();
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setActioning(null);
    }
  };

  const handleMarkInProcess = async (requestId) => {
    setActioning(requestId);
    try {
      await api.markLabTestInProcess(requestId, labUser);
      await load();
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setActioning(null);
    }
  };

  const filteredQueue = queue.filter((r) => {
    if (filter !== "all") {
      if (filter === "pending" && !["REQUESTED", "ACKNOWLEDGED", "REFERRED_TO_LAB", "PATIENT_ARRIVED_AT_LAB", "SAMPLE_COLLECTION_IN_PROCESS"].includes(r.status)) return false;
      if (filter === "in_process" && r.status !== "TEST_IN_PROCESS") return false;
      if (filter === "completed" && r.status !== "REPORT_READY") return false;
      if (filter === "critical") {
        const hasCritical = alerts.some((a) => (a.request_id || a.requestId) === r.request_id);
        if (!hasCritical) return false;
      }
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(r.patient_name || "").toLowerCase().includes(s) && !(r.request_id || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const getStatusBadgeClass = (status) => {
    const k = (status || "").toLowerCase().replace(/_/g, "-");
    return `lab-badge lab-badge--${k}`;
  };

  const getHistoryStatusCategory = (status, hasCritical) => {
    if (hasCritical) return "critical";
    if (status === "REPORT_READY" || status === "REPORT_RELEASED") return "complete";
    if (["REQUESTED", "ACKNOWLEDGED", "REFERRED_TO_LAB", "PATIENT_ARRIVED_AT_LAB", "SAMPLE_COLLECTION_IN_PROCESS"].includes(status)) return "pending";
    if (["SAMPLE_COLLECTED", "SAMPLE_RECEIVED_IN_LAB", "TEST_IN_PROCESS", "RESULTS_ENTERED", "RESULTS_VERIFIED"].includes(status)) return "in_progress";
    return "pending";
  };

  const filteredHistory = historyList.filter((r) => {
    const nameMatch = !historySearchName.trim() || (r.patient_name || "").toLowerCase().includes(historySearchName.trim().toLowerCase());
    const idMatch = !historySearchPatientId.trim() || (r.uhid || "").toLowerCase().includes(historySearchPatientId.trim().toLowerCase()) || (r.patient_id || "").toLowerCase().includes(historySearchPatientId.trim().toLowerCase());
    if (!nameMatch || !idMatch) return false;
    if (historyStatusFilter === "all") return true;
    const hasCritical = alerts.some((a) => (a.request_id || a.requestId) === r.request_id);
    const category = getHistoryStatusCategory(r.status, hasCritical);
    return category === historyStatusFilter;
  });

  return (
    <div className="lab-dashboard">
      <div className="lab-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'white', padding: '1.5rem 2rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Laboratory Workspace</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Monitor requests, collect samples, and publish test results.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="lab-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="lab-card lab-card--blue" style={{ background: 'white', border: 'none', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="lab-card__label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Requests Today</div>
          <div className="lab-card__value" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.total_requests_today ?? 0}</div>
        </div>
        <div className="lab-card lab-card--yellow" style={{ background: 'white', border: 'none', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="lab-card__label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Pending Collection</div>
          <div className="lab-card__value" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.pending_sample_collection ?? 0}</div>
        </div>
        <div className="lab-card lab-card--orange" style={{ background: 'white', border: 'none', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #f97316', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="lab-card__label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Tests in Process</div>
          <div className="lab-card__value" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.tests_in_process ?? 0}</div>
        </div>
        <div className="lab-card lab-card--green" style={{ background: 'white', border: 'none', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="lab-card__label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Reports Ready</div>
          <div className="lab-card__value" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.reports_ready_today ?? 0}</div>
        </div>
        <div className="lab-card lab-card--red" style={{ background: 'white', border: 'none', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="lab-card__label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Critical Alerts</div>
          <div className="lab-card__value" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{stats.critical_alerts ?? 0}</div>
        </div>
        <div className="lab-card lab-card--teal" style={{ background: 'white', border: 'none', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #0d9488', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="lab-card__label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Avg Wait Time</div>
          <div className="lab-card__value" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.average_wait_time_minutes ?? 0}<span style={{fontSize:'1rem', color:'#64748b', marginLeft:'4px', fontWeight:600}}>min</span></div>
        </div>
      </div>


      {waitingPatients.length > 0 && (
        <div className="lab-section lab-waiting-section">
          <h2 className="lab-section__title">Waiting patients</h2>
          <div className="lab-table-wrap">
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Tests</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waitingPatients.map((r) => {
                  const busy = actioning === r.request_id;
                  const isReferred = r.status === "REFERRED_TO_LAB" && !r.no_show_flag;
                  const isAtLab = r.status === "PATIENT_ARRIVED_AT_LAB";
                  return (
                    <tr key={r.request_id || r.id}>
                      <td>{r.patient_name || "—"}</td>
                      <td>{(r.tests_ordered || []).slice(0, 2).join(", ")}{(r.tests_ordered || []).length > 2 ? "…" : ""}</td>
                      <td><span className={getStatusBadgeClass(r.status)}>{STATUS_LABELS[r.status] || r.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {isReferred && (
                            <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleCheckIn(r.request_id)}>
                              <FiUserCheck size={14} /> Check in
                            </button>
                          )}
                          {isAtLab && (
                            <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleStartSample(r.request_id)}>
                              <FiPlayCircle size={14} /> Start Sample
                            </button>
                          )}
                          {isReferred && (
                            <button type="button" className="lab-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleMarkNoShow(r.request_id)}>
                              <FiXCircle size={14} /> No-Show
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="lab-grid">
        <div>
          <div className="lab-section">
            <h2 className="lab-section__title">Today&apos;s Test Queue</h2>
            <div className="lab-filters">
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="in_process">In process</option>
                <option value="completed">Completed</option>
                <option value="critical">Critical</option>
              </select>
              <input
                type="text"
                placeholder="Patient name or Request ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: "180px" }}
              />
            </div>
            <div className="lab-table-wrap">
              {loading ? (
                <p className="lab-empty">Loading…</p>
              ) : filteredQueue.length === 0 ? (
                <p className="lab-empty">No requests match the filters.</p>
              ) : (
                <table className="lab-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Tests</th>
                      <th>Doctor</th>
                      <th>Requested at</th>
                      <th>Sample status</th>
                      <th>Test status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.map((r) => {
                      const isCritical = alerts.some((a) => (a.request_id || a.requestId) === r.request_id);
                      const rowClass = isCritical ? "lab-table__row--critical" : r.status === "REPORT_READY" ? "lab-table__row--done" : ["REQUESTED", "ACKNOWLEDGED", "REFERRED_TO_LAB", "PATIENT_ARRIVED_AT_LAB", "SAMPLE_COLLECTION_IN_PROCESS"].includes(r.status) ? "lab-table__row--pending" : "";
                      const testsStr = Array.isArray(r.tests_ordered) ? r.tests_ordered.slice(0, 2).join(", ") + (r.tests_ordered.length > 2 ? "…" : "") : r.tests_ordered || "—";
                      const reqAt = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
                      const busy = actioning === r.request_id;
                      return (
                        <tr key={r.request_id || r.id} className={rowClass}>
                          <td>{r.patient_name || "—"}</td>
                          <td>{testsStr}</td>
                          <td>{r.doctor_name || "—"}</td>
                          <td>{reqAt}</td>
                          <td>
                            <span className={getStatusBadgeClass(r.status)}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                          <td>{r.status}</td>
                          <td>
                            <div className="lab-actions">
                              {r.status === "REQUESTED" && (
                                <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleAcknowledge(r.request_id)}>
                                  <FiCheckCircle size={14} /> Acknowledge
                                </button>
                              )}
                              {r.status === "REFERRED_TO_LAB" && !r.no_show_flag && (
                                <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleCheckIn(r.request_id)}>
                                  <FiUserCheck size={14} /> Check In
                                </button>
                              )}
                              {r.status === "PATIENT_ARRIVED_AT_LAB" && (
                                <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleStartSample(r.request_id)}>
                                  <FiPlayCircle size={14} /> Start Sample
                                </button>
                              )}
                              {r.status === "ACKNOWLEDGED" && (
                                <button type="button" className="lab-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} title="Patient must check in at lab first" onClick={() => handleStartSample(r.request_id)}>
                                  <FiPlayCircle size={14} /> Start (Legacy)
                                </button>
                              )}
                              {r.status === "SAMPLE_COLLECTION_IN_PROCESS" && (
                                <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleCompleteSample(r.request_id)}>
                                  <FiCheck size={14} /> Collected
                                </button>
                              )}
                              {(r.status === "SAMPLE_COLLECTED" || r.status === "SAMPLE_RECEIVED_IN_LAB") && (
                                <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleMarkInProcess(r.request_id)}>
                                  <FiActivity size={14} /> Process
                                </button>
                              )}
                              {r.status === "TEST_IN_PROCESS" && (
                                <button type="button" className="lab-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => navigate(`/lab/enter-results/${r.request_id}`)}>
                                  <FiEdit3 size={14} /> Results
                                </button>
                              )}
                              {r.status === "RESULTS_ENTERED" && (
                                <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => setReportModalRequestId(r.request_id)}>
                                  <FiFilePlus size={14} /> Report
                                </button>
                              )}
                              {r.status === "REPORT_READY" && (
                                <div className="lab-actions lab-actions--report-ready" style={{ display: 'flex', gap: '6px' }}>
                                  <button type="button" className="lab-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => setReportModalRequestId(r.request_id)} title="View or print report">
                                    <FiEye size={14} /> View
                                  </button>
                                  <button
                                    type="button"
                                    className="lab-btn lab-btn--primary lab-btn--send"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    disabled={busy || r.report_sent_to_doctor}
                                    onClick={async () => {
                                      setActioning(r.request_id);
                                      try {
                                        await api.sendLabReportToDoctor(r.request_id, labUser);
                                        showToast(r.report_sent_to_doctor ? "Already sent." : "Report sent to doctor.");
                                        await load();
                                      } catch (e) {
                                        alert(e?.message || "Failed to send to doctor");
                                      } finally {
                                        setActioning(null);
                                      }
                                    }}
                                    title={r.report_sent_to_doctor ? "Already sent to doctor" : "Send report to doctor"}
                                  >
                                    <FiSend size={14} /> Doctor
                                  </button>
                                  <button
                                    type="button"
                                    className="lab-btn lab-btn--primary lab-btn--send"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    disabled={busy || r.report_sent_to_patient}
                                    onClick={async () => {
                                      setActioning(r.request_id);
                                      try {
                                        await api.sendLabReportToPatient(r.request_id, labUser);
                                        showToast(r.report_sent_to_patient ? "Already sent." : "Report sent to patient.");
                                        await load();
                                      } catch (e) {
                                        alert(e?.message || "Failed to send to patient");
                                      } finally {
                                        setActioning(null);
                                      }
                                    }}
                                    title={r.report_sent_to_patient ? "Already sent to patient" : "Send report to patient"}
                                  >
                                    <FiSend size={14} /> Patient
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        <div>
          <div className="lab-alerts">
            <h3 className="lab-alerts__title">Critical alerts</h3>
            {alerts.length === 0 ? (
              <p className="lab-empty" style={{ padding: "0.5rem 0" }}>None</p>
            ) : (
              <ul className="lab-alerts__list">
                {alerts.slice(0, 10).map((a, i) => (
                  <li key={a.id || i} className="lab-alerts__item">{a.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="lab-section lab-history-section">
        <h2 className="lab-section__title">Lab Test History</h2>
        <p className="lab-section__subtitle">Search and view previous lab requests (beyond today&apos;s queue)</p>
        <div className="lab-filters lab-history-filters">
          <input
            type="text"
            placeholder="Search by patient name"
            value={historySearchName}
            onChange={(e) => setHistorySearchName(e.target.value)}
            className="lab-history-search"
          />
          <input
            type="text"
            placeholder="Search by Patient ID / UHID"
            value={historySearchPatientId}
            onChange={(e) => setHistorySearchPatientId(e.target.value)}
            className="lab-history-search"
          />
          <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="complete">Complete</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="lab-table-wrap">
          {loading ? (
            <p className="lab-empty">Loading history…</p>
          ) : filteredHistory.length === 0 ? (
            <p className="lab-empty">No lab requests match your search.</p>
          ) : (
            <table className="lab-table lab-history-table">
              <thead>
                <tr>
                  <th>Patient name</th>
                  <th>Patient ID / UHID</th>
                  <th>Request ID</th>
                  <th>Tests</th>
                  <th>Requested at</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((r) => {
                  const hasCritical = alerts.some((a) => (a.request_id || a.requestId) === r.request_id);
                  const category = getHistoryStatusCategory(r.status, hasCritical);
                  const categoryLabel = category === "complete" ? "Complete" : category === "pending" ? "Pending" : category === "in_progress" ? "In progress" : "Critical";
                  const testsStr = Array.isArray(r.tests_ordered) ? r.tests_ordered.slice(0, 2).join(", ") + (r.tests_ordered.length > 2 ? "…" : "") : r.tests_ordered || "—";
                  const reqAt = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
                  const busy = actioning === r.request_id;
                  return (
                    <tr key={r.request_id || r.id} className={category === "critical" ? "lab-table__row--critical" : ""}>
                      <td>{r.patient_name || "—"}</td>
                      <td>{r.uhid || r.patient_id || "—"}</td>
                      <td>{r.request_id || "—"}</td>
                      <td>{testsStr}</td>
                      <td>{reqAt}</td>
                      <td>
                        <span className={`lab-badge lab-badge--history lab-badge--history-${category}`}>{categoryLabel}</span>
                        <span className="lab-history-detail-status">{STATUS_LABELS[r.status] || r.status}</span>
                      </td>
                      <td>
                        <div className="lab-actions">
                          {r.status === "REQUESTED" && (
                            <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleAcknowledge(r.request_id)}>
                              <FiCheckCircle size={14} /> Acknowledge
                            </button>
                          )}
                          {r.status === "REFERRED_TO_LAB" && !r.no_show_flag && (
                            <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleCheckIn(r.request_id)}>
                              <FiUserCheck size={14} /> Check In
                            </button>
                          )}
                          {r.status === "PATIENT_ARRIVED_AT_LAB" && (
                            <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleStartSample(r.request_id)}>
                              <FiPlayCircle size={14} /> Start Sample
                            </button>
                          )}
                          {r.status === "ACKNOWLEDGED" && (
                            <button type="button" className="lab-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} title="Patient must check in at lab first" onClick={() => handleStartSample(r.request_id)}>
                              <FiPlayCircle size={14} /> Start (Legacy)
                            </button>
                          )}
                          {r.status === "SAMPLE_COLLECTION_IN_PROCESS" && (
                            <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleCompleteSample(r.request_id)}>
                              <FiCheck size={14} /> Collected
                            </button>
                          )}
                          {(r.status === "SAMPLE_COLLECTED" || r.status === "SAMPLE_RECEIVED_IN_LAB") && (
                            <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => handleMarkInProcess(r.request_id)}>
                              <FiActivity size={14} /> Process
                            </button>
                          )}
                          {r.status === "TEST_IN_PROCESS" && (
                            <button type="button" className="lab-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => navigate(`/lab/enter-results/${r.request_id}`)}>
                              <FiEdit3 size={14} /> Results
                            </button>
                          )}
                          {r.status === "RESULTS_ENTERED" && (
                            <button type="button" className="lab-btn lab-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => setReportModalRequestId(r.request_id)}>
                              <FiFilePlus size={14} /> Report
                            </button>
                          )}
                          {r.status === "REPORT_READY" && (
                            <div className="lab-actions lab-actions--report-ready" style={{ display: 'flex', gap: '6px' }}>
                              <button type="button" className="lab-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={busy} onClick={() => setReportModalRequestId(r.request_id)} title="View or print report">
                                <FiEye size={14} /> View
                              </button>
                              <button
                                type="button"
                                className="lab-btn lab-btn--primary lab-btn--send"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                disabled={busy || r.report_sent_to_doctor}
                                onClick={async () => {
                                  setActioning(r.request_id);
                                  try {
                                    await api.sendLabReportToDoctor(r.request_id, labUser);
                                    showToast(r.report_sent_to_doctor ? "Already sent." : "Report sent to doctor.");
                                    await load();
                                  } catch (e) {
                                    alert(e?.message || "Failed to send to doctor");
                                  } finally {
                                    setActioning(null);
                                  }
                                }}
                                title={r.report_sent_to_doctor ? "Already sent to doctor" : "Send report to doctor"}
                              >
                                <FiSend size={14} /> Doctor
                              </button>
                              <button
                                type="button"
                                className="lab-btn lab-btn--primary lab-btn--send"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                disabled={busy || r.report_sent_to_patient}
                                onClick={async () => {
                                  setActioning(r.request_id);
                                  try {
                                    await api.sendLabReportToPatient(r.request_id, labUser);
                                    showToast(r.report_sent_to_patient ? "Already sent." : "Report sent to patient.");
                                    await load();
                                  } catch (e) {
                                    alert(e?.message || "Failed to send to patient");
                                  } finally {
                                    setActioning(null);
                                  }
                                }}
                                title={r.report_sent_to_patient ? "Already sent to patient" : "Send report to patient"}
                              >
                                <FiSend size={14} /> Patient
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && (
        <div className="lab-toast" role="status">
          {toast}
        </div>
      )}

      <LabReportModal
        open={!!reportModalRequestId}
        requestId={reportModalRequestId}
        onClose={() => setReportModalRequestId(null)}
        onSaved={() => { load(); showToast("Report saved."); }}
        generatedBy={labUser}
      />
    </div>
  );
}

export default LabDashboard;
