import React from "react";
import { FiUser, FiHash, FiMapPin, FiCalendar, FiActivity, FiCheckCircle, FiRefreshCw } from "react-icons/fi";

const CLINICAL_STATUS_OPTIONS = ["Stable", "Critical", "Under Observation"];

function PatientHeader({
  uhid,
  patientName,
  admission = null,
  roleEditingIndicator,
  editingBy = [],
  viewingBy = [],
  autoSaveStatus,
  onUpdateAdmission,
  canEdit = true,
}) {
  const admissionId = admission?.admission_id || admission?.id || null;
  const ward = admission?.ward ?? "—";
  const bed = admission?.bed ?? "—";
  const admissionDate = admission?.admission_date
    ? new Date(admission.admission_date).toLocaleDateString()
    : "—";
  const clinicalStatus = admission?.clinical_status ?? "Under Observation";
  const careTeam = admission?.care_team || [];

  const handleStatusChange = (e) => {
    if (!canEdit || !onUpdateAdmission || !admissionId) return;
    onUpdateAdmission({ clinical_status: e.target.value });
  };

  return (
    <div className="doctor-patient-summary-bar">
      <div className="doctor-summary-item">
        <div className="doctor-summary-icon">
          <FiUser />
        </div>
        <div className="doctor-summary-content">
          <span className="doctor-summary-label">Patient Name</span>
          <span className="doctor-summary-value">{patientName || "—"}</span>
        </div>
      </div>

      <div className="doctor-summary-item">
        <div className="doctor-summary-icon">
          <FiHash />
        </div>
        <div className="doctor-summary-content">
          <span className="doctor-summary-label">UHID / Admin ID</span>
          <span className="doctor-summary-value">{uhid || "—"} {admissionId ? `/ ${admissionId}` : ""}</span>
        </div>
      </div>

      <div className="doctor-summary-item">
        <div className="doctor-summary-icon">
          <FiMapPin />
        </div>
        <div className="doctor-summary-content">
          <span className="doctor-summary-label">Ward / Bed</span>
          <span className="doctor-summary-value">{ward} / {bed}</span>
        </div>
      </div>

      <div className="doctor-summary-item">
        <div className="doctor-summary-icon">
          <FiCalendar />
        </div>
        <div className="doctor-summary-content">
          <span className="doctor-summary-label">Admission Date</span>
          <span className="doctor-summary-value">{admissionDate}</span>
        </div>
      </div>

      <div className="doctor-summary-item">
        <div className="doctor-summary-icon">
          <FiActivity />
        </div>
        <div className="doctor-summary-content">
          <span className="doctor-summary-label">Clinical Status</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {canEdit && onUpdateAdmission && admissionId ? (
              <select
                value={clinicalStatus}
                onChange={handleStatusChange}
                className="doctor-patient-header__select"
                style={{ 
                  padding: "4px 10px", 
                  fontSize: "0.85rem", 
                  background: "white", 
                  borderRadius: "8px", 
                  border: "1px solid var(--doc-border)",
                  fontWeight: "600",
                  color: "var(--doc-primary)"
                }}
              >
                {CLINICAL_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <span className="doctor-summary-value">{clinicalStatus}</span>
            )}
          </div>
        </div>
      </div>

      <div className="doctor-summary-item" style={{ minWidth: '140px' }}>
        <div className="doctor-summary-content" style={{ width: '100%' }}>
          <span className="doctor-summary-label">Sync Status</span>
          <div className="doctor-patient-header__meta-item--save" style={{ 
            fontSize: '0.85rem', 
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '600',
            color: autoSaveStatus ? 'var(--doc-primary)' : '#f97316'
          }}>
            {autoSaveStatus != null ? (
              autoSaveStatus ? (
                <><FiCheckCircle /> Cloud Synced</>
              ) : (
                <><FiRefreshCw style={{ animation: 'spin 2s linear infinite' }} /> Syncing…</>
              )
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientHeader;
