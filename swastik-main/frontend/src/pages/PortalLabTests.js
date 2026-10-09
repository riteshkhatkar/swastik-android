import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiDownload } from "react-icons/fi";
import { buildLabReportPrintHtml } from "../utils/labReportPrint";
import swastikLogo from "../assets/swasstiklogo.png";
import "./PortalStyles.css";

const STATUS_LABELS = {
  REQUESTED: "Requested",
  ACKNOWLEDGED: "Acknowledged",
  REFERRED_TO_LAB: "Referred to lab",
  PATIENT_ARRIVED_AT_LAB: "At lab – checked in",
  SAMPLE_COLLECTION_IN_PROCESS: "Sample in progress",
  SAMPLE_COLLECTED: "Sample collected",
  SAMPLE_RECEIVED_IN_LAB: "Sample received",
  TEST_IN_PROCESS: "Test in process",
  RESULTS_ENTERED: "Results entered",
  REPORT_READY: "Report ready",
};

const PortalLabTests = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("portal_user"));
    if (!savedUser) {
      navigate("/patient-portal/login");
      return;
    }
    setUser(savedUser);
    const uhid = savedUser.username || savedUser.uhid || savedUser.patientId;
    const patientIds = [savedUser.uhid, savedUser.username, savedUser.patientId, savedUser.id].filter(Boolean);
    const patientIdParam = [...new Set(patientIds)].filter(Boolean).join(",") || uhid;
    if (!patientIdParam) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { api } = await import("../api/service");
        const res = await api.getLabTestRequests({ patient_id: patientIdParam, limit: 100 });
        setRequests(Array.isArray(res) ? res : []);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleViewDownloadReport = async (requestId) => {
    try {
      const { api } = await import("../api/service");
      const data = await api.getLabReportData(requestId);
      if (!data?.request) {
        alert("Report data not available.");
        return;
      }
      const origin = window.location.origin;
      const logoPath = (typeof swastikLogo === "string" ? swastikLogo : swastikLogo?.src) || "";
      const logoUrl = logoPath ? (logoPath.startsWith("http") ? logoPath : origin + (logoPath.startsWith("/") ? logoPath : "/" + logoPath)) : "";
      const html = buildLabReportPrintHtml(data, requestId, logoUrl);
      const w = window.open("", "_blank");
      if (!w) {
        alert("Please allow pop-ups to view the report.");
        return;
      }
      w.document.write(html);
      w.document.close();
    } catch (err) {
      alert(err?.message || "Failed to load lab report.");
    }
  };

  if (!user) return null;

  return (
    <div className="portal-sub-page">
      <div className="portal-header">
        <h2>My Lab Tests</h2>
        <p>View your lab test requests and download reports when ready.</p>
      </div>
      {loading ? (
        <p className="portal-loading">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="portal-empty-state">
          <p>No lab tests found.</p>
        </div>
      ) : (
        <div className="portal-table-container portal-reports-table" style={{ marginTop: "1.5rem" }}>
          <table className="portal-data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Tests</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.request_id || r.id}>
                  <td style={{ fontWeight: 600 }}>{r.request_id}</td>
                  <td>{(r.tests_ordered || []).join(", ")}</td>
                  <td>
                    <span className={`portal-lab-status portal-lab-status--${(r.status || "").toLowerCase().replace(/_/g, "-")}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                    {r.status === "PATIENT_ARRIVED_AT_LAB" && (
                      <div className="portal-lab-arrival">Arrival confirmed.</div>
                    )}
                  </td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                  <td>
                    {r.status === "REPORT_READY" && (
                      <button
                        type="button"
                        className="portal-action-btn portal-action-btn--primary"
                        onClick={() => handleViewDownloadReport(r.request_id)}
                      >
                        <FiDownload size={16} /> View / Download report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PortalLabTests;
