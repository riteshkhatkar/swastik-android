import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { api } from "../../api/service";
import EMR from "./components/EMR";
import PatientHeader from "./components/PatientHeader";
import swastikLogo from "../../assets/swastiklogo.png";
import "./doctor.css";

function DoctorConsultation() {
  const location = useLocation();
  const params = useParams();
  const uhid = params.uhid;
  const statePatientId = location.state?.patientId;
  const statePatientName = location.state?.patientName;

  const patientId = uhid || statePatientId;
  const patientName = statePatientName || (patientId ? `Patient ${patientId}` : null);

  const [context, setContext] = useState({ patient: null, admission: null });
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [patientLabRequests, setPatientLabRequests] = useState([]);
  const [referringRequestId, setReferringRequestId] = useState(null);
  const [session, setSession] = useState(null); // { locked: bool, locked_by: string, isOwner: bool }
  const [isStartingSession, setIsStartingSession] = useState(false);
  const doctorName = (() => {
    const userStr = localStorage.getItem("swastik_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.full_name || user.name || "Doctor";
    }
    return "Doctor";
  })();

  const loadContext = useCallback(async () => {
    if (!patientId) return;
    try {
      const data = await api.getEmrContext(patientId);
      setContext({ patient: data.patient, admission: data.admission });
    } catch {
      setContext({ patient: null, admission: null });
    }
  }, [patientId]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const loadPatientLabRequests = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await api.getLabTestRequests({ patient_id: patientId, limit: 20 });
      setPatientLabRequests(Array.isArray(res) ? res : []);
    } catch {
      setPatientLabRequests([]);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatientLabRequests();
  }, [loadPatientLabRequests]);

  const loadSessionStatus = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await api.getSessionStatus(patientId);
      const userStr = localStorage.getItem("swastik_user");
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      // Fallback: decode ID from token if missing in user object
      let currentUserId = currentUser?.id || currentUser?._id;
      if (!currentUserId) {
        const token = localStorage.getItem("swastik_token");
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.id;
          } catch (e) {
            console.error("Failed to decode token", e);
          }
        }
      }
      
      setSession({
        ...res,
        isOwner: res.locked && String(res.doctor_id) === String(currentUserId)
      });
    } catch (err) {
      console.error("Failed to load session status", err);
    }
  }, [patientId]);

  useEffect(() => {
    loadSessionStatus();
    // Poll session status every 10 seconds to detect locks from others
    const interval = setInterval(loadSessionStatus, 10000);
    return () => clearInterval(interval);
  }, [loadSessionStatus]);

  const handleStartConsultation = async () => {
    if (!patientId) return;
    setIsStartingSession(true);
    try {
      await api.startSession(patientId);
      await loadSessionStatus();
    } catch (err) {
      alert(err.message || "Failed to start consultation");
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleEndConsultation = async () => {
    if (!patientId) return;
    try {
      await api.endSession(patientId);
      await loadSessionStatus();
      // Optionally navigate back or show a summary
      alert("Consultation ended and patient record unlocked.");
    } catch (err) {
      alert(err.message || "Failed to end consultation");
    }
  };

  const handleSendToLab = async (requestId) => {
    setReferringRequestId(requestId);
    try {
      const res = await api.referPatientToLab(requestId, doctorName);
      await loadPatientLabRequests();
    } catch (err) {
      alert(err.message || "Failed to refer to lab");
    } finally {
      setReferringRequestId(null);
    }
  };

  const handleUpdateAdmission = async (payload) => {
    const admissionId = context.admission?.admission_id || context.admission?.id;
    if (!admissionId || !patientId) return;
    try {
      await api.updateEmrAdmission(admissionId, payload);
      await loadContext();
    } catch (e) {
      console.error(e);
    }
  };

  if (!patientId || !patientName) {
    return (
      <>
        <h2 className="doctor-page-title">New Consultation</h2>
        <div className="doctor-card">
          <p className="doctor-emr-subtitle">Select a patient to open EMR</p>
          <p>
            Go to <Link to="/doctor">Dashboard</Link> or{" "}
            <Link to="/doctor/appointments">Today's Appointments</Link> or{" "}
            <Link to="/doctor/patients">Patient List</Link> and click &quot;Open&quot; or
            &quot;Open EMR&quot; to start a consultation.
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="doctor-consultation-page">
      <div className="doctor-consultation-header">
        <div className="doctor-consultation-title-stack">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={swastikLogo} alt="Swastik Hospital" style={{ height: '32px', width: 'auto' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--doc-primary)', letterSpacing: '0.5px' }}>SWASTIK</span>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Hospital EMR</span>
            </div>
          </div>
          <div style={{ height: '32px', width: '1px', background: '#e2e8f0', margin: '0 1.5rem' }}></div>
          <div>
            <h2 className="doctor-page-title" style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
              {session?.locked ? (session.isOwner ? "In Consultation" : "View Only Mode") : "Start Consultation"}
            </h2>
            <p className="doctor-consultation-subtitle" style={{ margin: 0, fontSize: '0.8rem' }}>
              <Link to="/doctor" style={{ color: "#64748b", textDecoration: "none" }}>Dashboard</Link>
              <span style={{ margin: '0 8px', color: '#cbd5e1' }}>/</span>
              <span style={{ color: "var(--doc-primary)", fontWeight: 700 }}>{patientName}</span>
            </p>
          </div>
        </div>

        <div className="doctor-consultation-actions" style={{ display: 'flex', gap: '12px' }}>
          {!session?.locked && (
            <button 
              className="doctor-btn doctor-btn--primary" 
              onClick={handleStartConsultation}
              disabled={isStartingSession}
            >
              {isStartingSession ? "Starting..." : "Start Consultation"}
            </button>
          )}
          {session?.isOwner && (
            <button 
              className="doctor-btn doctor-btn--danger" 
              onClick={handleEndConsultation}
            >
              End Consultation
            </button>
          )}
          {session?.locked && !session.isOwner && (
            <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Locked by {session.locked_by}
            </div>
          )}
        </div>
      </div>

      <PatientHeader
        uhid={patientId}
        patientName={context.patient?.name || patientName}
        admission={context.admission}
        roleEditingIndicator="Psychiatrist"
        editingBy={context.editing || []}
        viewingBy={context.viewing || []}
        autoSaveStatus={autoSaveStatus}
        onUpdateAdmission={handleUpdateAdmission}
        canEdit={session?.isOwner || !session?.locked}
      />
      <EMR
        patientId={patientId}
        patientName={context.patient?.name || patientName}
        admissionId={context.admission?.admission_id || context.admission?.id}
        admission={context.admission}
        onContextRefresh={loadContext}
        onAutoSaveStatus={setAutoSaveStatus}
        patientLabRequests={patientLabRequests}
        loadPatientLabRequests={loadPatientLabRequests}
        onSendToLab={handleSendToLab}
        referringRequestId={referringRequestId}
        canEdit={session?.isOwner}
      />
    </div>
  );
}

export default DoctorConsultation;
