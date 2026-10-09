import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiCalendar, FiClock, FiCheckCircle, FiActivity, FiBriefcase, FiAlertTriangle, FiPlus, FiLogOut } from 'react-icons/fi';
import "./ReceptionistDashboard.css";
import DischargeDialog from "../../components/receptionist/DischargeDialog";

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [pending, setPending] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [emergencyQueue, setEmergencyQueueState] = useState([]);
  const [admissionRequests, setAdmissionRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState({
    todayAdmissions: 0,
    currentInpatients: 0,
    availableRooms: 0,
    pendingDischarges: 0
  });
  const [patientCounts, setPatientCounts] = useState({ total: 0, opd: 0, followUp: 0, therapy: 0, emergency: 0 });
  const [loading, setLoading] = useState(true);

  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyData, setNotifyData] = useState({ doctorId: '', doctorName: '', date: new Date().toISOString().split('T')[0], time: '', reason: '' });
  const [tokens, setTokens] = useState([]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ id: '', patientName: '', doctorId: '', date: '', time: '' });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelData, setCancelData] = useState({ id: '', patientName: '', reason: '' });
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const { api } = await import("../../api/service");
      const todayStr = new Date().toISOString().split('T')[0];
      
      const [allAppointments, doctorsData, counts, ipdList, allRooms] = await Promise.all([
        api.getAppointments(),
        api.getDoctors(),
        api.getDashboardCounts(),
        api.getIPDList(0, 100).catch(() => []),
        api.getRooms().catch(() => []),
      ]);

      setAppointments(Array.isArray(allAppointments) ? allAppointments : []);
      setPending(Array.isArray(allAppointments) ? allAppointments.filter((a) => a.status === "scheduled" || a.status === "pending") : []);
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
      
      setPatientCounts({
        total: counts.patients || 0,
        opd: counts.opd || 0,
        followUp: counts.appointments || 0,
        therapy: 0,
        emergency: ipdList.filter(a => a.clinical_status === 'Critical' || a.clinical_status === 'Emergency').length,
      });

      setAdmissionRequests(Array.isArray(ipdList) ? ipdList : []);

      // Calculate Stats
      const statsData = {
        todayAdmissions: ipdList.filter(a => a.created_at?.startsWith(todayStr)).length,
        currentInpatients: ipdList.length,
        availableRooms: allRooms.filter(r => r.status === "Available").length,
        pendingDischarges: ipdList.filter(a => 
          a.clinical_status === 'Ready for Discharge' || 
          a.clinical_status === 'Discharge Planned' ||
          a.status === 'discharged_pending'
        ).length
      };
      setStats(statsData);

    } catch (err) {
      console.error("Error refreshing dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { api } = await import("../../api/service");
      const patients = await api.getPatients();
      const filtered = patients.filter(p =>
        (p.uhid || "").toLowerCase().includes(q.toLowerCase()) ||
        (p.phone || "").includes(q) ||
        (p.name || "").toLowerCase().includes(q.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 5));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const confirmedAppointments = appointments.filter((a) => a.status === "confirmed");
  const confirmedCount = confirmedAppointments.length;
  const pendingCount = pending.length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const doctorAbsent = doctors.find((d) => !d.available);

  const handleBlockSlot = async (e) => {
    e.preventDefault();
    try {
      const { api } = await import("../../api/service");
      await api.blockSlot(notifyData.doctorId, notifyData.date, notifyData.time, notifyData.reason);
      alert("Slot blocked and patients will be notified.");
      setShowNotifyModal(false);
      refresh();
    } catch (err) {
      alert("Error blocking slot: " + err.message);
    }
  };

  const openNotifyModal = (doc) => {
    setNotifyData({ ...notifyData, doctorId: doc._id, doctorName: doc.name });
    setShowNotifyModal(true);
  };

  const handleConfirmRequest = async (req) => {
    try {
      const { api } = await import("../../api/service");
      await api.updateAppointmentStatus(req._id, 'confirmed');
      refresh();
    } catch (err) {
      alert("Error confirming appointment: " + err.message);
    }
  };

  const handleRescheduleRequest = (req) => {
    setRescheduleData({
      id: req._id,
      patientName: req.patient_name || req.patientName,
      doctorId: req.doctor_id,
      date: req.appointment_date || req.date,
      time: req.appointment_time || req.time
    });
    setShowRescheduleModal(true);
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    try {
      const { api } = await import("../../api/service");
      await api.rescheduleAppointment(rescheduleData.id, {
        date: rescheduleData.date,
        time: rescheduleData.time
      });
      alert("Appointment rescheduled successfully");
      setShowRescheduleModal(false);
      refresh();
    } catch (err) {
      alert("Error rescheduling: " + err.message);
    }
  };

  const handleCancelRequest = (req) => {
    setCancelData({ id: req._id, patientName: req.patient_name || req.patientName });
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    try {
      const { api } = await import("../../api/service");
      await api.cancelAppointment(cancelData.id, cancelData.reason);
      alert("Appointment cancelled successfully");
      setShowCancelConfirm(false);
      setCancelData({ id: '', patientName: '', reason: '' });
      refresh();
    } catch (err) {
      alert("Error cancelling: " + err.message);
    }
  };

  const handleAddEmergency = () => {
    navigate("/receptionist/patients/register", { state: { emergency: true } });
  };

  const handleOpenDischarge = (adm) => {
    setSelectedAdmission(adm);
    setShowDischargeModal(true);
  };

  if (loading) return <div className="recep-dash"><p>Synchronizing with Hospital Systems...</p></div>;

  return (
    <div className="recep-dash">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="recep-dash-title">Reception Control Tower</h1>
          <p className="recep-dash-subtitle">Live hospital desk operations and patient flow management.</p>
        </div>
        <button type="button" className="recep-quick-reg-btn" onClick={() => navigate("/receptionist/patients/register")}>
          <FiPlus /> Register New Patient
        </button>
      </div>

      {/* 1. Statistics Cards - Hospital Occupancy */}
      <section className="recep-dash-section">
        <h2 className="recep-dash-section-title"><FiActivity /> Hospital Occupancy & Flow</h2>
        <div className="recep-dash-cards">
          <div className="recep-dash-card" style={{ borderLeft: '5px solid #0d9488' }}>
            <span className="recep-dash-card-label">TODAY'S ADMISSIONS</span>
            <span className="recep-dash-card-value">{stats.todayAdmissions}</span>
            <span style={{ fontSize: '0.8rem', color: '#059669' }}>&uarr; Fresh Arrivals</span>
          </div>
          <div className="recep-dash-card" style={{ borderLeft: '5px solid #3b82f6' }}>
            <span className="recep-dash-card-label">CURRENT INPATIENTS</span>
            <span className="recep-dash-card-value">{stats.currentInpatients}</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Capacity Occupied</span>
          </div>
          <div className="recep-dash-card" style={{ borderLeft: '5px solid #10b981' }}>
            <span className="recep-dash-card-label">AVAILABLE ROOMS</span>
            <span className="recep-dash-card-value">{stats.availableRooms}</span>
            <span style={{ fontSize: '0.8rem', color: '#059669' }}>Ready for Admission</span>
          </div>
          <div className="recep-dash-card" style={{ borderLeft: '5px solid #f59e0b' }}>
            <span className="recep-dash-card-label">PENDING DISCHARGES</span>
            <span className="recep-dash-card-value">{stats.pendingDischarges}</span>
            <span style={{ fontSize: '0.8rem', color: '#b45309' }}>Awaiting Settlement</span>
          </div>
        </div>

        {doctorAbsent && (
          <div className="recep-dash-warning">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FiAlertTriangle style={{ fontSize: '1.25rem' }} />
              <span><strong>Doctor Not Available:</strong> {doctorAbsent.name} is currently out of office.</span>
            </div>
            <div className="recep-dash-warning-actions">
              <button type="button" className="recep-btn recep-btn-primary" onClick={() => openNotifyModal(doctorAbsent)}>Notify Patients & Block Slots</button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Pending Requests */}
      <section className="recep-dash-section">
        <h2 className="recep-dash-section-title"><FiClock /> Pending Appointment Requests</h2>
        <div className="recep-table-wrap">
          <table className="recep-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>UHID</th>
                <th>Doctor</th>
                <th>Schedule</th>
                <th>Token</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr><td colSpan={7} className="recep-table-empty">No appointments at the moment.</td></tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a._id}>
                    <td><strong>{a.patient_name || a.patientName}</strong></td>
                    <td><code style={{ fontSize: '0.8rem' }}>{a.uhid}</code></td>
                    <td>{a.doctor_name || a.doctor}</td>
                    <td>{a.appointment_date} at {a.appointment_time}</td>
                    <td>
                      {a.token_number && a.token_number !== "T-N/A" ? (
                        <span className="recep-badge-arrival" style={{ backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }}>{a.token_number}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`recep-status recep-status-${a.status === 'confirmed' ? 'confirmed' : a.status === 'scheduled' ? 'pending' : a.status === 'cancelled' ? 'critical' : 'stable'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {a.status === 'scheduled' && (
                        <button type="button" className="recep-btn recep-btn-small recep-btn-primary" onClick={() => handleConfirmRequest(a)}>Confirm</button>
                      )}
                      <button type="button" className="recep-btn recep-btn-small recep-btn-secondary" onClick={() => handleRescheduleRequest(a)}>Reschedule</button>
                      {a.status !== 'cancelled' && (
                        <button type="button" className="recep-btn recep-btn-small" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleCancelRequest(a)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Daily Patient Metrics */}
      <section className="recep-dash-section">
        <h2 className="recep-dash-section-title"><FiUsers /> Daily Patient Metrics</h2>
        <div className="recep-dash-cards">
          <div className="recep-dash-card">
            <div className="recep-dash-card-icon"><FiUsers /></div>
            <span className="recep-dash-card-value">{patientCounts.total}</span>
            <span className="recep-dash-card-label">Total Arrivals</span>
          </div>
          <div className="recep-dash-card">
            <div className="recep-dash-card-icon"><FiActivity /></div>
            <span className="recep-dash-card-value">{patientCounts.opd}</span>
            <span className="recep-dash-card-label">OPD Walk-ins</span>
          </div>
          <div className="recep-dash-card">
            <div className="recep-dash-card-icon"><FiClock /></div>
            <span className="recep-dash-card-value">{patientCounts.followUp}</span>
            <span className="recep-dash-card-label">Follow-up Visits</span>
          </div>
          <div className="recep-dash-card">
            <div className="recep-dash-card-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}><FiAlertTriangle /></div>
            <span className="recep-dash-card-value">{patientCounts.emergency}</span>
            <span className="recep-dash-card-label">Psychiatric Crisis</span>
          </div>
        </div>
      </section>

      {/* 5. Emergency Cases */}
      <section className="recep-dash-section recep-dash-emergency">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 className="recep-dash-section-title" style={{ marginBottom: '0.5rem' }}>Crisis Management</h2>
            <p style={{ color: '#991b1b', fontSize: '0.9rem', margin: 0 }}>High priority alerts for walk-in psychiatric emergencies.</p>
          </div>
          <button type="button" className="recep-btn-emergency" onClick={handleAddEmergency}>
            <FiAlertTriangle /> Initiate Emergency Protocol
          </button>
        </div>

        {emergencyQueue.length > 0 ? (
          <div className="recep-emergency-list">
            {emergencyQueue.map((e) => (
              <div key={e.id} className="recep-emergency-item">
                <span className="recep-badge-emergency">IMMEDIATE ATTENTION</span>
                <span style={{ fontWeight: 600 }}>{e.patientName || "Unnamed Patient"}</span>
                <span style={{ color: '#64748b' }}>&bull; {e.reason || "Psychiatric Crisis"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#991b1b', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
            No active psychiatric emergency cases.
          </div>
        )}
      </section>

      {/* 6. Live Inpatient Tracking */}
      <section className="recep-dash-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="recep-dash-section-title"><FiBriefcase /> Live Inpatient Tracking</h2>
          <button className="recep-btn recep-btn-secondary" onClick={() => navigate("/receptionist/room-management")}>
            <FiActivity /> Live Room Visualizer &rarr;
          </button>
        </div>
        <div className="recep-table-wrap">
          <table className="recep-table">
            <thead>
              <tr>
                <th>Patient Name / ID</th>
                <th>Room & Ward</th>
                <th>Primary Doctor</th>
                <th>Clinical Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissionRequests.length === 0 ? (
                <tr><td colSpan={5} className="recep-table-empty">No active inpatients at the moment.</td></tr>
              ) : (
                admissionRequests.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{a.patient_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.uhid}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>Room {a.room_number}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.ward || "General Ward"}</div>
                    </td>
                    <td>Dr. {a.doctor_name}</td>
                    <td>
                      <span className={`recep-status ${a.clinical_status === 'Critical' ? 'recep-status-critical' :
                        a.clinical_status === 'Ready for Discharge' ? 'recep-status-discharge' :
                          a.clinical_status === 'Stable' ? 'recep-status-stable' :
                            'recep-status-observation'
                        }`}>
                        {a.clinical_status || "Under Observation"}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="recep-btn recep-btn-small recep-btn-primary" onClick={() => handleOpenDischarge(a)}>
                        <FiLogOut /> Discharge
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="recep-modal-overlay">
          <div className="recep-modal">
            <div className="recep-modal-header">
              <h3>Reschedule Appointment - {rescheduleData.patientName}</h3>
              <button onClick={() => setShowRescheduleModal(false)}>&times;</button>
            </div>
            <form onSubmit={submitReschedule} className="recep-modal-body">
              <div className="recep-form-group">
                <label>New Date</label>
                <input
                  type="date"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                  required
                />
              </div>
              <div className="recep-form-group">
                <label>New Time Slot</label>
                <select
                  value={rescheduleData.time}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                  required
                >
                  <option value="">Select Slot</option>
                  {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="recep-modal-footer">
                <button type="button" className="recep-btn recep-btn-secondary" onClick={() => setShowRescheduleModal(false)}>Back</button>
                <button type="submit" className="recep-btn recep-btn-primary">Confirm Reschedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="recep-modal-overlay">
          <div className="recep-modal">
            <div className="recep-modal-header">
              <h3>Cancel Appointment - {cancelData.patientName}</h3>
              <button onClick={() => setShowCancelConfirm(false)}>&times;</button>
            </div>
            <div className="recep-modal-body">
              <p>Are you sure you want to cancel this appointment?</p>
              <div className="recep-form-group" style={{ marginTop: '1rem' }}>
                <label>Reason for Cancellation</label>
                <textarea
                  value={cancelData.reason}
                  onChange={(e) => setCancelData({ ...cancelData, reason: e.target.value })}
                  placeholder="e.g., Patient requested, Doctor unavailable..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}
                  rows="3"
                />
              </div>
            </div>
            <div className="recep-modal-footer">
              <button type="button" className="recep-btn recep-btn-secondary" onClick={() => setShowCancelConfirm(false)}>Back</button>
              <button type="button" className="recep-btn" style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }} onClick={confirmCancel}>Confirm Cancellation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
