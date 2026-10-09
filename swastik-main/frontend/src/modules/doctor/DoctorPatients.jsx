import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/service";
import "./doctor.css";

function DoctorPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
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

      let appointments = [];
      if (isChouguleTeam && teamDoctorIds.length > 0) {
        const results = await Promise.all(teamDoctorIds.map(id => api.getAppointments(null, 0, 200, id)));
        appointments = results.flat();
      } else {
        appointments = await api.getAppointments(null, 0, 200, doctorId);
      }

      // Get unique patients from confirmed/completed appointments
      const uniquePatientsMap = new Map();
      appointments
        .filter(apt => apt.status === "confirmed" || apt.status === "completed")
        .forEach(apt => {
          if (!uniquePatientsMap.has(apt.uhid)) {
            uniquePatientsMap.set(apt.uhid, {
              uhid: apt.uhid,
              name: apt.patient_name,
              lastVisit: apt.appointment_date,
              id: apt._id
            });
          }
        });

      setPatients(Array.from(uniquePatientsMap.values()));
    } catch (err) {
      console.error("Error fetching doctor's patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const openConsultation = (p) => {
    navigate("/doctor/consultation", {
      state: { patientId: p.uhid, patientName: p.name },
    });
  };

  if (loading) return <div className="doctor-page">Loading patient list...</div>;

  return (
    <>
      <h2 className="doctor-page-title">My Patients</h2>
      <div className="doctor-card">
        <div className="doctor-table-wrap">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>UHID</th>
                <th>Name</th>
                <th>Most Recent Visit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No patients found for your profile.</td></tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.uhid}>
                    <td>{p.uhid}</td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.lastVisit}</td>
                    <td>
                      <button
                        type="button"
                        className="doctor-btn doctor-btn--primary doctor-btn--sm"
                        onClick={() => openConsultation(p)}
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

export default DoctorPatients;
