import React, { useState, useEffect } from "react";
import { FiCalendar, FiClock, FiCheckCircle, FiActivity } from 'react-icons/fi';
import { getTodayAppointments, getPendingRequests } from "./receptionistData";
import "./ReceptionistDashboard.css";

export default function ReceptionistAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [pending, setPending] = useState([]);

  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const { api } = await import("../../api/service");
      const allAppointments = await api.getAppointments();
      setAppointments(allAppointments || []);
      // Filter for scheduled appointments for the "Pending" section
      setPending(allAppointments.filter(a => a.status === 'scheduled') || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <div className="recep-dash" style={{ padding: '2rem', textAlign: 'center' }}>Loading appointments...</div>;

  return (
    <div className="recep-dash">
      <h1 className="recep-dash-title">Appointments Schedule</h1>
      <p className="recep-dash-subtitle">Manage today&apos;s surgical and clinical appointments.</p>

      <section className="recep-dash-section">
        <h2 className="recep-dash-section-title"><FiCalendar /> Today&apos;s Appointments</h2>
        <div className="recep-table-wrap">
          <table className="recep-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Assigned Doctor</th>
                <th>Time Slot</th>
                <th>Visit Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr><td colSpan={5} className="recep-table-empty">No appointments scheduled for today.</td></tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a._id || a.id}>
                    <td><strong>{a.patientName || a.patient_name}</strong></td>
                    <td>{a.doctor || a.doctor_name}</td>
                    <td><FiClock style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {a.time || a.appointment_time}</td>
                    <td><span className="recep-status recep-status-pending">{a.type || "OPD"}</span></td>
                    <td><span className={`recep-status recep-status-${a.status}`}>{a.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="recep-dash-section">
        <h2 className="recep-dash-section-title"><FiClock /> Pending Requests</h2>
        <div className="recep-table-wrap">
          <table className="recep-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Requested Doctor</th>
                <th>Proposed Date & Time</th>
                <th>Appointment Type</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr><td colSpan={4} className="recep-table-empty">No pending clinical requests.</td></tr>
              ) : (
                pending.map((req) => (
                  <tr key={req._id || req.id}>
                    <td><strong>{req.patientName || req.patient_name}</strong></td>
                    <td>{req.doctor || req.doctor_name}</td>
                    <td>{req.date || req.appointment_date} at {req.time || req.appointment_time}</td>
                    <td><span className="recep-status recep-status-pending">{req.type || "OPD"}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
