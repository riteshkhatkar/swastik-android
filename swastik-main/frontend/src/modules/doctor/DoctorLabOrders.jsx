import React, { useState, useEffect } from "react";
import { FiDownload } from "react-icons/fi";
import { api } from "../../api/service";
import { buildLabReportPrintHtml } from "../../utils/labReportPrint";
import swastikLogo from "../../assets/swasstiklogo.png";
import "./doctor.css";

const STATUS_LABELS = {
  REQUESTED: "Requested",
  ACKNOWLEDGED: "Acknowledged",
  SAMPLE_COLLECTION_IN_PROCESS: "Sample in progress",
  SAMPLE_COLLECTED: "Sample collected",
  TEST_IN_PROCESS: "Test in process",
  RESULTS_ENTERED: "Results entered",
  REPORT_READY: "Report ready",
};

function DoctorLabOrders() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("swastik_user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const doctorId = user._id || user.id;
        const username = (user.username || "").toLowerCase();

        // Check for Chougule Team (Dr. PM and Dr. Nikhil)
        const isChouguleTeam = username === "pmchougule" || username === "nikhilchougule";
        let targetDoctorId = doctorId;

        if (isChouguleTeam) {
            try {
                const allDoctors = await api.getDoctors();
                const teamIds = allDoctors
                    .filter(d => (d.name || "").includes("Chougule"))
                    .map(d => d._id || d.id);
                if (teamIds.length > 0) {
                    targetDoctorId = teamIds.join(",");
                }
            } catch (e) {
                console.error("Failed to fetch team doctors", e);
            }
        }

        const res = await api.getLabTestRequests({ doctor_id: targetDoctorId, limit: 200 });
        setRequests(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Error fetching lab orders:", err);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const handleViewDownloadReport = async (requestId) => {
    try {
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

  return (
    <div className="doctor-card">
      <h2 className="doctor-page-title">Lab Orders &amp; Reports</h2>
      <p className="doctor-emr-subtitle">View ordered tests and download reports when ready.</p>
      <div style={{ marginBottom: "1rem" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <p>No lab requests found.</p>
      ) : (
        <div className="doctor-lab-orders-wrap">
          <table className="doctor-lab-orders-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Patient</th>
                <th>Tests</th>
                <th>Status</th>
                <th>Requested at</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.request_id || r.id}>
                  <td style={{ fontWeight: 600 }}>{r.request_id}</td>
                  <td>{r.patient_name || "—"}</td>
                  <td>{(r.tests_ordered || []).slice(0, 2).join(", ")}{(r.tests_ordered || []).length > 2 ? "…" : ""}</td>
                  <td>
                    <span className={`doctor-lab-order-status doctor-lab-order-status--${(r.status || "").toLowerCase().replace(/_/g, "-")}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                    {r.status === "REPORT_READY" && r.report_sent_to_doctor && (
                      <span className="doctor-lab-order-sent-badge">Sent to you</span>
                    )}
                  </td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  <td>
                    {r.status === "REPORT_READY" && (
                      <button
                        type="button"
                        className="doctor-lab-order-action-btn"
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
}

export default DoctorLabOrders;
