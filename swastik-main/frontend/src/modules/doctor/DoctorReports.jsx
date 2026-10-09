import React, { useState, useEffect } from "react";
import { api } from "../../api/service";
import "./doctor.css";
import { FiPrinter, FiSearch, FiFileText, FiUser, FiArrowLeft } from "react-icons/fi";
import { generateComprehensiveReport } from "../../utils/reportGenerator";

function DoctorReports() {
    const [searchTerm, setSearchTerm] = useState("");
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [printingId, setPrintingId] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    const fetchPatients = async (term) => {
        if (!term || term.trim().length < 2) {
            setPatients([]);
            setHasSearched(false);
            return;
        }

        try {
            setLoading(true);
            setHasSearched(true);
            // We use getAppointments or similar to find our patients, 
            // or we could have a dedicated patient search but let's reuse doctor patients logic
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
                const results = await Promise.all(teamDoctorIds.map(id => api.getAppointments(null, 0, 100, id)));
                appointments = results.flat();
            } else {
                appointments = await api.getAppointments(null, 0, 100, doctorId);
            }

            // Unique patients matching search
            const q = term.toLowerCase();
            const uniqueMap = new Map();
            appointments.forEach(apt => {
                const nameMatch = apt.patient_name?.toLowerCase().includes(q);
                const uhidMatch = apt.uhid?.toLowerCase().includes(q);
                if ((nameMatch || uhidMatch) && !uniqueMap.has(apt.uhid)) {
                    uniqueMap.set(apt.uhid, {
                        uhid: apt.uhid,
                        name: apt.patient_name,
                        gender: apt.gender,
                        age: apt.age
                    });
                }
            });
            setPatients(Array.from(uniqueMap.values()));
        } catch (err) {
            console.error("Error searching patients:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        fetchPatients(value);
    };

    const handlePrintReport = async (p) => {
        try {
            setPrintingId(p.uhid);
            const userStr = localStorage.getItem("swastik_user");
            const user = userStr ? JSON.parse(userStr) : {};
            const doctorName = user.full_name || user.name || "Consultant Psychiatrist";

            // Fetch COMPREHENSIVE EMR data
            // 1. Context (Admission)
            const context = await api.getEmrContext(p.uhid).catch(() => ({}));
            const admissionId = context.admission?.admission_id;

            // 2. Clinical Data (Parallel)
            const [
                vitals,
                meds,
                labEntries,
                labOrders,
                soapNotes,
                diagnosis,
                risk,
                symptoms,
                treatment,
                histItems,
                clinicalHist
            ] = await Promise.all([
                api.listVitals(p.uhid, admissionId).catch(() => []),
                api.listMedications(p.uhid, admissionId).catch(() => []),
                api.listLabMonitoring(p.uhid, admissionId).catch(() => []),
                api.getLabTestRequests({ patient_id: p.uhid }).catch(() => []),
                api.listSessionNotes(p.uhid, admissionId).catch(() => []),
                api.getDiagnosis(p.uhid, admissionId).catch(() => null),
                api.getRisk(p.uhid, admissionId).catch(() => null),
                api.getSymptomsHpi(p.uhid, admissionId).catch(() => null),
                api.getTreatmentPlan(p.uhid, admissionId).catch(() => null),
                api.listHistoryEvents(p.uhid).catch(() => []),
                api.getClinicalHistory(p.uhid).catch(() => [])
            ]);

            // Transform SOAP entries for the report (latest one)
            const latestSoap = soapNotes.length > 0 ? {
                s: soapNotes[0].subjective,
                o: soapNotes[0].objective,
                a: soapNotes[0].assessment,
                p: soapNotes[0].plan
            } : {};

            // Combine histories
            const combinedHistories = [
                ...(Array.isArray(histItems) ? histItems : []),
                ...(Array.isArray(clinicalHist) ? clinicalHist.map(c => ({
                    date: c.created_at,
                    description: `${c.type}: ${c.data?.short_term_goals ? 'Treatment Plan Update' : 'Interaction Record'}`
                })) : [])
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            const reportData = {
                patient: p,
                admission: context.admission,
                emrData: {
                    vitals: vitals,
                    medications: meds,
                    labResults: labEntries,
                    soap: latestSoap,
                    diagnosis: diagnosis,
                    risk: risk,
                    chief_complaint: symptoms?.chief_complaint,
                    mse: { summary: symptoms?.summary }, // symptoms record often contains MSE summary
                    treatment: treatment
                },
                labOrders: labOrders,
                histories: combinedHistories,
                doctorName: doctorName
            };

            generateComprehensiveReport(reportData);
        } catch (err) {
            console.error("Failed to generate report:", err);
            alert("Error generating report. Please try again.");
        } finally {
            setPrintingId(null);
        }
    };

    return (
        <div className="doctor-reports-page">
            <h2 className="doctor-page-title">Medical Reports</h2>
            <p className="doctor-emr-subtitle">Search for a patient to generate and print comprehensive medical reports.</p>

            <div className="doctor-card" style={{ marginBottom: "1.5rem" }}>
                <div className="doctor-search-bar" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <FiSearch style={{ color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder="Search patient by UHID or Name..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }}
                    />
                </div>
            </div>

            <div className="reports-patient-list">
                {!hasSearched ? (
                    <div className="doctor-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <FiFileText style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                        <p style={{ color: '#64748b' }}>Enter UHID or Name to find a patient record.</p>
                    </div>
                ) : loading ? (
                    <div className="doctor-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: '#64748b' }}>Searching patient database...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="doctor-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: '#64748b' }}>No patient found matching "{searchTerm}".</p>
                    </div>
                ) : (
                    <div className="doctor-card">
                        <div className="doctor-table-wrap">
                            <table className="doctor-table">
                                <thead>
                                    <tr>
                                        <th>UHID</th>
                                        <th>Patient Name</th>
                                        <th>Details</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.map((p) => (
                                        <tr key={p.uhid}>
                                            <td style={{ fontWeight: 600, color: 'var(--doc-primary)' }}>{p.uhid}</td>
                                            <td><strong>{p.name}</strong></td>
                                            <td><span style={{ fontSize: '0.85rem', color: '#64748b' }}>{p.gender}, {p.age} yrs</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="doctor-btn doctor-btn--primary doctor-btn--sm"
                                                    onClick={() => handlePrintReport(p)}
                                                    disabled={printingId === p.uhid}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    {printingId === p.uhid ? "Preparing..." : <><FiPrinter /> Print Full Report</>}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DoctorReports;
