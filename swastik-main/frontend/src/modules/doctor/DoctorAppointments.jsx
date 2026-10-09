import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/service";
import "./doctor.css";

function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem("swastik_user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const doctorId = user._id || user.id;
      const username = user.username.toLowerCase();

      // Check for Chougule Team (Dr. PM and Dr. Nikhil)
      const isChouguleTeam = username === "pmchougule" || username === "nikhilchougule";
      
      let teamDoctorIds = [doctorId];
      if (isChouguleTeam) {
        try {
          const allDoctors = await api.getDoctors();
          teamDoctorIds = allDoctors
            .filter(d => d.name.includes("Chougule"))
            .map(d => d._id);
        } catch (e) {
          console.error("Failed to fetch doctors list", e);
        }
      }

      let data = [];
      if (isChouguleTeam && teamDoctorIds.length > 0) {
        const results = await Promise.all(teamDoctorIds.map(id => api.getAppointments(null, 0, 100, id)));
        data = results.flat();
      } else {
        data = await api.getAppointments(null, 0, 100, doctorId);
      }

      // Filter for today's confirmed appointments
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Remove duplicates and sort
      const uniqueApts = Array.from(new Map(data.filter(a => a.appointment_date === todayStr && a.status === "confirmed").map(item => [item._id, item])).values());
      setAppointments(uniqueApts.sort((a,b) => a.appointment_time.localeCompare(b.appointment_time)));
    } catch (err) {
      console.error("Error fetching today's appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  const openConsultation = (row) => {
    navigate("/doctor/consultation", {
      state: { patientId: row.uhid, patientName: row.patient_name },
    });
  };

  if (loading) return <div className="doctor-page">Loading appointments...</div>;

  return (
    <>
      <h2 className="doctor-page-title">Today's Appointments</h2>
      <div className="doctor-card">
        <div className="doctor-table-wrap">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>UHID</th>
                <th>Type</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No appointments scheduled for today.</td></tr>
              ) : (
                appointments.map((row) => (
                  <tr key={row._id}>
                    <td>{row.appointment_time}</td>
                    <td><strong>{row.patient_name}</strong></td>
                    <td>{row.uhid}</td>
                    <td>{row.type}</td>
                    <td>
                      <span className={`recep-status recep-status-${row.status === 'confirmed' ? 'confirmed' : 'pending'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="doctor-btn doctor-btn--primary doctor-btn--sm"
                        onClick={() => openConsultation(row)}
                      >
                        Open EMR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default DoctorAppointments;
