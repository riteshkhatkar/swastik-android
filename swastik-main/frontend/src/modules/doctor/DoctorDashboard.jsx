import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/service";

const SUMMARY_CARDS_TEMPLATE = [
  {
    key: "appointments",
    label: "Today's Appointments",
    value: 0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    )
  },
  {
    key: "highRisk",
    label: "High Risk Patients",
    value: 0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    )
  },
  {
    key: "followUps",
    label: "Pending Follow-ups",
    value: 0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    )
  },
];

function DoctorDashboard({ defaultTab = "opd" }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab); // opd or ipd
  const [appointments, setAppointments] = useState([]);
  const [inpatients, setInpatients] = useState([]);
  const [cards, setCards] = useState(SUMMARY_CARDS_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem("swastik_user");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const doctorId = user._id || user.id;
      const username = user.username.toLowerCase();

      // Check for Chougule Team (Dr. PM and Dr. Nikhil)
      const isChouguleTeam = username === "pmchougule" || username === "nikhilchougule";
      
      let allDoctors = [];
      if (isChouguleTeam) {
        try {
          allDoctors = await api.getDoctors();
        } catch (e) {
          console.error("Failed to fetch doctors list", e);
        }
      }

      const teamDoctorIds = isChouguleTeam 
        ? allDoctors
            .filter(d => d.name.includes("Chougule"))
            .map(d => d._id)
        : [doctorId];

      if (activeTab === "opd") {
        let combinedApts = [];
        if (isChouguleTeam && teamDoctorIds.length > 0) {
          // Fetch for all team members
          const results = await Promise.all(teamDoctorIds.map(id => api.getAppointments(null, 0, 100, id)));
          combinedApts = results.flat();
        } else {
          combinedApts = await api.getAppointments(null, 0, 100, doctorId);
        }

        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todaysApts = combinedApts.filter(a => a.appointment_date === todayString && a.status === "confirmed");
        
        // Remove duplicates if any (by _id)
        const uniqueApts = Array.from(new Map(todaysApts.map(item => [item._id, item])).values());
        setAppointments(uniqueApts.sort((a,b) => a.appointment_time.localeCompare(b.appointment_time)));

        // Calculate metrics
        const newCards = [...SUMMARY_CARDS_TEMPLATE];
        newCards[0].value = uniqueApts.length;
        newCards[1].value = uniqueApts.filter(a => (a.notes || "").toLowerCase().includes("high risk")).length;
        newCards[2].value = combinedApts.filter(a => a.type === "Follow-up" && a.status === "scheduled").length;
        newCards[3].value = 0;

        setCards(newCards);
      } else {
        const data = await (api.getIPDList ? api.getIPDList(0, 100) : []);
        // For Chougule team, show all admissions tagged to either doctor
        const doctorAdmissions = data.filter(a => teamDoctorIds.includes(a.doctor_id));
        setInpatients(doctorAdmissions);
      }

      // Fetch tokens for both
      let combinedTokens = [];
      if (isChouguleTeam && teamDoctorIds.length > 0) {
        const results = await Promise.all(teamDoctorIds.map(id => api.getTokensByDoctor(id)));
        combinedTokens = results.flat();
      } else {
        combinedTokens = await api.getTokensByDoctor(doctorId);
      }
      
      const uniqueTokens = Array.from(new Map(combinedTokens.map(item => [item._id, item])).values());
      setTokens(uniqueTokens.sort((a,b) => a.token_number - b.token_number));
      
      const sessions = await api.getActiveSessions();
      setActiveSessions(sessions || []);
    } catch (err) {
      console.error("Error fetching doctor dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTokenStatus = async (tokenId, status) => {
    try {
      await api.updateTokenStatus(tokenId, status);
      fetchData();
    } catch (err) {
      console.error("Error updating token status:", err);
    }
  };

  const openConsultation = (patientId, patientName, admissionId = null, extraProps = {}) => {
    // Check if locked by someone else
    const session = activeSessions.find(s => s.patient_id === patientId);
    const userStr = localStorage.getItem("swastik_user");
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const currentUserId = currentUser?.id || currentUser?._id;

    if (session && String(session.doctor_id) !== String(currentUserId)) {
      alert(`Access Denied: This patient is currently being consulted by ${session.doctor_name}`);
      return;
    }

    navigate("/doctor/patient-profile", {
      state: { patientId, patientName, admissionId, ...extraProps },
    });
  };

  const getLockStatus = (uhid) => {
    const session = activeSessions.find(s => s.patient_id === uhid);
    if (!session) return null;
    
    const userStr = localStorage.getItem("swastik_user");
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const currentUserId = currentUser?.id || currentUser?._id;
    
    const isOwner = String(session.doctor_id) === String(currentUserId);
    
    return {
      isLocked: true,
      lockedBy: session.doctor_name,
      isOwner
    };
  };

  if (loading) return <div className="doctor-dashboard">Loading workstation...</div>;

  return (
    <div className="doctor-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="doctor-page-title" style={{ margin: 0 }}>Doctor Workstation</h2>
        <div className="doctor-tabs">
          <button
            className={`doctor-tab ${activeTab === "opd" ? "doctor-tab--active" : ""}`}
            onClick={() => setActiveTab("opd")}
          >
            OPD Clinic
          </button>
          <button
            className={`doctor-tab ${activeTab === "ipd" ? "doctor-tab--active" : ""}`}
            onClick={() => setActiveTab("ipd")}
          >
            Ward Rounds (IPD)
          </button>
        </div>
      </div>

      <div className="doctor-cards">
        {cards.map((card) => (
          <div key={card.key} className="doctor-card doctor-metric-card">
            <div style={{ color: "var(--doc-primary)", marginBottom: "16px", background: "var(--doc-primary-light)", display: "inline-flex", padding: "12px", borderRadius: "12px", width: "fit-content" }}>
              {card.icon}
            </div>
            <span className="doctor-metric-card__label">{card.label}</span>
            <span className="doctor-metric-card__value">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="doctor-card doctor-dashboard-table-wrap">
        <h3 className="doctor-card__heading">
          {activeTab === "opd" ? "Today's Appointment Schedule" : "Current Ward Inpatients"}
        </h3>
        <div className="doctor-table-wrap">
          <table className="doctor-table">
            <thead>
              {activeTab === "opd" ? (
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>UHID</th>
                  <th>Type</th>
                  <th>Risk Status</th>
                  <th>Action</th>
                </tr>
              ) : (
                <tr>
                  <th>Room/Bed</th>
                  <th>Patient</th>
                  <th>UHID</th>
                  <th>Admission Date</th>
                  <th>Clinical Status</th>
                  <th>Diagnosis</th>
                  <th>Action</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === "opd" ? (
                appointments.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No appointments scheduled for today.</td></tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt._id}>
                      <td>{apt.appointment_time}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{apt.patient_name}</strong>
                          {getLockStatus(apt.uhid) && (
                            <span title={`Locked by ${getLockStatus(apt.uhid).lockedBy}`} style={{ color: '#ef4444' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{apt.uhid}</td>
                      <td><span className="recep-status recep-status-pending" style={{ fontSize: '0.7rem' }}>{apt.type}</span></td>
                      <td>
                        <span className={`doctor-risk-badge doctor-risk-badge--${(apt.notes || "").toLowerCase().includes("high") ? "high" : "low"}`}>
                          {(apt.notes || "").toLowerCase().includes("high") ? "High" : "Normal"}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={`doctor-btn doctor-btn--sm ${getLockStatus(apt.uhid) && !getLockStatus(apt.uhid).isOwner ? 'doctor-btn--secondary' : 'doctor-btn--primary'}`}
                          onClick={() => openConsultation(apt.uhid, apt.patient_name, null, { appointmentId: apt._id })}
                          disabled={getLockStatus(apt.uhid) && !getLockStatus(apt.uhid).isOwner}
                        >
                          {getLockStatus(apt.uhid) && !getLockStatus(apt.uhid).isOwner ? 'Locked' : 'Open EMR'}
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                inpatients.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No patients currently admitted under your care.</td></tr>
                ) : (
                  inpatients.map((adm) => (
                    <tr key={adm._id}>
                      <td><strong>{adm.room_number || "Ward"}</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{adm.patient_name}</strong>
                          {getLockStatus(adm.uhid) && (
                            <span title={`Locked by ${getLockStatus(adm.uhid).lockedBy}`} style={{ color: '#ef4444' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{adm.uhid}</td>
                      <td>{new Date(adm.admission_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`recep-status ${adm.clinical_status === 'Critical' ? 'recep-status-critical' :
                          adm.clinical_status === 'Ready for Discharge' ? 'recep-status-discharge' :
                            adm.clinical_status === 'Stable' ? 'recep-status-stable' :
                              'recep-status-observation'
                          }`} style={{ fontSize: '0.7rem' }}>
                          {adm.clinical_status || "Admitted"}
                        </span>
                      </td>
                      <td>{adm.diagnosis}</td>
                      <td>
                        <button 
                          className={`doctor-btn doctor-btn--sm ${getLockStatus(adm.uhid) && !getLockStatus(adm.uhid).isOwner ? 'doctor-btn--secondary' : 'doctor-btn--primary'}`}
                          onClick={() => openConsultation(adm.uhid, adm.patient_name, adm._id)}
                          disabled={getLockStatus(adm.uhid) && !getLockStatus(adm.uhid).isOwner}
                        >
                          {getLockStatus(adm.uhid) && !getLockStatus(adm.uhid).isOwner ? 'Locked' : 'Ward Round'}
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="doctor-card doctor-dashboard-table-wrap" style={{ marginTop: '2rem' }}>
        <h3 className="doctor-card__heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--doc-primary)'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Live Patient Queue (Tokens)
        </h3>
        <div className="doctor-table-wrap">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Status</th>
                <th>Time</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No patients in queue.</td></tr>
              ) : (
                tokens.map((t) => (
                  <tr key={t._id} onClick={() => openConsultation(t.patient_id, t.patient_name, null, { tokenNumber: t.token_number, appointmentId: t.appointment_id })} style={{ cursor: 'pointer' }}>
                    <td><span className="doctor-risk-badge doctor-risk-badge--low" style={{ background: 'var(--doc-primary-light)', color: 'var(--doc-primary)', fontWeight: 'bold' }}>{t.token_number}</span></td>
                    <td><strong>{t.patient_name}</strong></td>
                    <td>
                      <span className={`recep-status recep-status-${t.status === 'waiting' ? 'pending' : t.status === 'in_consultation' ? 'confirmed' : 'completed'}`} style={{ fontSize: '0.7rem' }}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ textAlign: 'right' }}>
                      {t.status === 'waiting' && (
                        <button
                          className="doctor-btn doctor-btn--sm doctor-btn--primary"
                          onClick={(e) => { e.stopPropagation(); handleUpdateTokenStatus(t._id, 'in_consultation'); }}
                        >
                          Start Consultation
                        </button>
                      )}
                      {t.status === 'in_consultation' && (
                        <button
                          className="doctor-btn doctor-btn--sm doctor-btn--primary"
                          onClick={(e) => { e.stopPropagation(); handleUpdateTokenStatus(t._id, 'completed'); }}
                        >
                          Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;
