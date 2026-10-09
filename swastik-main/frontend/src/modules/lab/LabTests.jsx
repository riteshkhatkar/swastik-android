import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/service";
import LabReportModal from "./LabReportModal";
import { 
  FiSearch, FiFilter, FiActivity, FiEye, FiEdit3, FiCheck, 
  FiBookOpen, FiDollarSign, FiClock, FiGrid, FiList, 
  FiCheckCircle, FiUserCheck, FiPlayCircle, FiFilePlus, FiSend
} from "react-icons/fi";
import { FaFlask } from "react-icons/fa";

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

function LabTests() {
  const navigate = useNavigate();
  const labUser = localStorage.getItem("swastik_lab_user") || "Lab Assistant";

  // Tab State: "samples" or "catalog"
  const [activeTab, setActiveTab] = useState("samples");

  // Catalog State
  const [catalog, setCatalog] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Samples/Requests State
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actioning, setActioning] = useState(null);
  const [toast, setToast] = useState(null);
  const [reportModalRequestId, setReportModalRequestId] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Catalog
  const fetchCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const data = await api.getLabCatalog();
      setCatalog(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load catalog:", e);
      setCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  // Fetch Requests/Samples
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await api.getLabTestRequests({ today_only: false, limit: 500 });
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load test requests:", e);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchCatalog();
  }, [fetchRequests, fetchCatalog]);

  // Action Handlers
  const handleAcknowledge = async (requestId) => {
    setActioning(requestId);
    try {
      await api.acknowledgeLabRequest(requestId, labUser);
      showToast("Request acknowledged.");
      await fetchRequests();
    } catch (e) {
      alert(e.message || "Failed to acknowledge");
    } finally {
      setActioning(null);
    }
  };

  const handleCheckIn = async (requestId) => {
    setActioning(requestId);
    try {
      await api.checkInPatientAtLab(requestId, labUser);
      showToast("Patient checked in at lab.");
      await fetchRequests();
    } catch (e) {
      alert(e.message || "Failed to check in");
    } finally {
      setActioning(null);
    }
  };

  const handleStartSample = async (requestId) => {
    setActioning(requestId);
    try {
      await api.startLabSampleCollection(requestId, labUser);
      showToast("Sample collection started.");
      await fetchRequests();
    } catch (e) {
      alert(e.message || "Failed to start collection");
    } finally {
      setActioning(null);
    }
  };

  const handleCompleteSample = async (requestId) => {
    if (!window.confirm("Confirm: Sample collected for this patient?")) return;
    setActioning(requestId);
    try {
      await api.completeLabSampleCollection(requestId, { sample_type: "blood", sample_condition: "good", collected_by: labUser });
      showToast("Sample collected and barcode generated.");
      await fetchRequests();
    } catch (e) {
      alert(e.message || "Failed to complete sample collection");
    } finally {
      setActioning(null);
    }
  };

  const handleMarkInProcess = async (requestId) => {
    setActioning(requestId);
    try {
      await api.markLabTestInProcess(requestId, labUser);
      showToast("Test processing started.");
      await fetchRequests();
    } catch (e) {
      alert(e.message || "Failed to mark in process");
    } finally {
      setActioning(null);
    }
  };

  // Filter Catalog
  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch = 
      (item.test_name || "").toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(catalogSearch.toLowerCase());
    
    if (catalogCategory === "all") return matchesSearch;
    return matchesSearch && item.category === catalogCategory;
  });

  const categories = ["all", ...new Set(catalog.map((i) => i.category).filter(Boolean))];

  // Filter Requests/Samples
  const filteredRequests = requests.filter((r) => {
    const matchesSearch = 
      (r.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.request_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.sample_id || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    
    // Status Categories
    if (statusFilter === "pending") {
      return matchesSearch && ["REQUESTED", "ACKNOWLEDGED", "REFERRED_TO_LAB", "PATIENT_ARRIVED_AT_LAB", "SAMPLE_COLLECTION_IN_PROCESS"].includes(r.status);
    }
    if (statusFilter === "collected") {
      return matchesSearch && ["SAMPLE_COLLECTED", "SAMPLE_RECEIVED_IN_LAB", "TEST_IN_PROCESS"].includes(r.status);
    }
    if (statusFilter === "completed") {
      return matchesSearch && ["RESULTS_ENTERED", "RESULTS_VERIFIED", "REPORT_READY", "REPORT_RELEASED"].includes(r.status);
    }
    
    return matchesSearch && r.status === statusFilter;
  });

  const getStatusBadgeClass = (status) => {
    const k = (status || "").toLowerCase().replace(/_/g, "-");
    return `lab-badge lab-badge--${k}`;
  };

  return (
    <div className="lab-dashboard" style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div className="lab-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'white', padding: '1.5rem 2rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Tests & Samples</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Track sample lifecycles and browse the laboratory service catalog.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #e2e8f0", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setActiveTab("samples")}
          style={{
            padding: "10px 20px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "samples" ? "3px solid #0d9488" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: activeTab === "samples" ? "#0d9488" : "#64748b",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <FiActivity style={{ marginRight: "8px", verticalAlign: "middle" }} /> Samples & Requests
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          style={{
            padding: "10px 20px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "catalog" ? "3px solid #0d9488" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: activeTab === "catalog" ? "#0d9488" : "#64748b",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <FiBookOpen style={{ marginRight: "8px", verticalAlign: "middle" }} /> Test Catalog
        </button>
      </div>

      {/* Tab Contents: Samples */}
      {activeTab === "samples" && (
        <div className="lab-section">
          <div className="lab-filters" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "1.5rem", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
              <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search by Patient Name, Request ID, or Sample ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem"
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                background: "white",
                cursor: "pointer"
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Samples</option>
              <option value="collected">Collected & In Process</option>
              <option value="completed">Completed Tests</option>
              <option value="REQUESTED">Requested</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="SAMPLE_COLLECTED">Sample Collected</option>
              <option value="TEST_IN_PROCESS">Test In Process</option>
              <option value="REPORT_READY">Report Ready</option>
            </select>
          </div>

          <div className="lab-table-wrap" style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            {loadingRequests ? (
              <p className="lab-empty">Loading requests and samples...</p>
            ) : filteredRequests.length === 0 ? (
              <p className="lab-empty">No test requests or samples found matching the filters.</p>
            ) : (
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Request ID</th>
                    <th>Sample ID</th>
                    <th>Tests Ordered</th>
                    <th>Requested At</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((r) => {
                    const testsStr = Array.isArray(r.tests_ordered) ? r.tests_ordered.join(", ") : r.tests_ordered || "—";
                    const reqAt = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
                    const busy = actioning === r.request_id;
                    return (
                      <tr key={r.request_id || r.id}>
                        <td style={{ fontWeight: 600, color: "#1e293b" }}>{r.patient_name || "—"}</td>
                        <td><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "0.85rem" }}>{r.request_id}</code></td>
                        <td>
                          {r.sample_id ? (
                            <span style={{ fontFamily: "monospace", color: "#0f766e", fontWeight: 700 }}>{r.sample_id}</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>Not Collected</span>
                          )}
                        </td>
                        <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={testsStr}>{testsStr}</td>
                        <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{reqAt}</td>
                        <td>
                          <span className={getStatusBadgeClass(r.status)}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td>
                          <div className="lab-actions" style={{ display: "flex", gap: "6px" }}>
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
                            {(r.status === "REPORT_READY" || r.status === "REPORT_RELEASED") && (
                              <button type="button" className="lab-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setReportModalRequestId(r.request_id)}>
                                <FiEye size={14} /> View Report
                              </button>
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
      )}

      {/* Tab Contents: Catalog */}
      {activeTab === "catalog" && (
        <div className="lab-section">
          <div className="lab-filters" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "1.5rem", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
              <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search test name or category..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem"
                }}
              />
            </div>
            <select
              value={catalogCategory}
              onChange={(e) => setCatalogCategory(e.target.value)}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                background: "white",
                textTransform: "capitalize",
                cursor: "pointer"
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {loadingCatalog ? (
              <p className="lab-empty" style={{ gridColumn: "1 / -1" }}>Loading catalog tests...</p>
            ) : filteredCatalog.length === 0 ? (
              <p className="lab-empty" style={{ gridColumn: "1 / -1" }}>No tests found in the catalog.</p>
            ) : (
              filteredCatalog.map((item) => (
                <div 
                  key={item._id || item.test_name} 
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    padding: "1.25rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.02)";
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.75rem", background: "#f0fdfa", color: "#0d9488", padding: "4px 10px", borderRadius: "20px", fontWeight: 700, textTransform: "uppercase" }}>
                        {item.category || "General"}
                      </span>
                      <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0d9488", display: "inline-flex", alignItems: "center" }}>
                        <FiDollarSign size={14} /> {item.price || 0}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 10px 0" }}>{item.test_name}</h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.85rem", color: "#64748b", margin: "10px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Sample Type:</span>
                        <span style={{ fontWeight: 600, color: "#334155", textTransform: "capitalize" }}>{item.sample_type || "N/A"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Turnaround:</span>
                        <span style={{ fontWeight: 600, color: "#334155", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <FiClock size={12} /> {item.turnaround_time_hours ? `${item.turnaround_time_hours} hrs` : "N/A"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Ref Range:</span>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {item.reference_range_text || (item.reference_range_min !== null && item.reference_range_max !== null ? `${item.reference_range_min} - ${item.reference_range_max} ${item.unit || ""}` : "As per standard")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <div className="lab-toast" role="status">
          {toast}
        </div>
      )}

      {/* Lab Report Modal */}
      <LabReportModal
        open={!!reportModalRequestId}
        requestId={reportModalRequestId}
        onClose={() => setReportModalRequestId(null)}
        onSaved={() => { fetchRequests(); showToast("Report saved."); }}
        generatedBy={labUser}
      />
    </div>
  );
}

export default LabTests;
