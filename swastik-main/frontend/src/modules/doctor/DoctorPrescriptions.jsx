import React, { useState, useEffect } from "react";
import { api } from "../../api/service";
import "./doctor.css";
import { FiPrinter, FiSearch, FiCalendar, FiUser } from "react-icons/fi";
import jsPDF from "jspdf";
import "jspdf-autotable";
import swastikLogo from "../../assets/swastiklogo.png";

function DoctorPrescriptions() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

    const fetchPrescriptions = async (term) => {
        if (!term || term.trim().length === 0) {
            setPrescriptions([]);
            setHasSearched(false);
            return;
        }

        try {
            setLoading(true);
            setHasSearched(true);
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
                const results = await Promise.all(teamDoctorIds.map(id => api.getPrescriptions({
                    doctor_id: id,
                    search: term
                })));
                data = results.flat();
            } else {
                data = await api.getPrescriptions({
                    doctor_id: doctorId,
                    search: term
                });
            }
            
            // Deduplicate if any
            const uniqueData = Array.from(new Map(data.map(item => [item._id || item.id, item])).values());
            setPrescriptions(uniqueData);
        } catch (err) {
            console.error("Error fetching prescriptions:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        // We can debounce this or search on enter. Let's do it on change for now as requested.
        fetchPrescriptions(value);
    };

    const filteredPrescriptions = prescriptions;

    const handlePrint = (p) => {
        const doc = new jsPDF();
        const now = new Date().toLocaleString();

        // Swastik Hospital Header with Logo
        try {
            doc.addImage(swastikLogo, 'PNG', 15, 10, 30, 30);
        } catch (e) {
            console.warn("Logo failed to load in PDF", e);
        }

        doc.setFontSize(24);
        doc.setTextColor(13, 148, 136); // Teal primary
        doc.setFont(undefined, 'bold');
        doc.text("SWASTIK HOSPITAL", 50, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont(undefined, 'normal');
        doc.text("Psychiatric Care & Rehabilitation Center", 50, 28);
        doc.text("123 Health Ave, Medical District, MH - 400001", 50, 33);
        doc.text("Contact: +91 98765 43210 | email: info@swastikhospital.com", 50, 38);

        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(0.5);
        doc.line(15, 45, 195, 45);

        // Prescription Info Strip
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 50, 180, 25, 'F');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFont(undefined, 'bold');
        doc.text(`PATIENT: ${(p.patient_name || "N/A").toUpperCase()} (${p.uhid})`, 20, 59);
        doc.text(`DATE: ${new Date(p.created_at).toLocaleDateString()}`, 20, 66);
        doc.text(`REPORT TYPE: PRESCRIPTION`, 120, 59);
        doc.text(`DOCTOR: ${p.doctor_name || "Consultant Psychiatrist"}`, 120, 66);
        doc.setFont(undefined, 'normal');

        let currentY = 85;

        // Header for Medications
        doc.setFontSize(14);
        doc.setTextColor(13, 148, 136);
        doc.text("PRESCRIPTION", 15, currentY);
        doc.line(15, currentY + 2, 60, currentY + 2);

        currentY += 10;

        // Medications Table
        const medRows = (p.medications || []).map(m => [
            m.drug_name || "-",
            m.dose || "-",
            m.frequency || "-",
            m.route || "PO",
            m.duration || "N/A"
        ]);

        doc.autoTable({
            startY: currentY,
            head: [["Medicine", "Dose", "Freq", "Route", "Duration"]],
            body: medRows.length ? medRows : [["No medications prescribed", "-", "-", "-", "-"]],
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] },
            styles: { fontSize: 9 }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        if (p.notes) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text("Clinical Notes:", 15, currentY);
            doc.setFont(undefined, 'normal');
            const splitNotes = doc.splitTextToSize(p.notes, 175);
            doc.text(splitNotes, 15, currentY + 7);
            currentY += 10 + (splitNotes.length * 5);
        }

        // Signature Area
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount} | ${p.patient_name || "N/A"} (${p.uhid})`, 105, 285, { align: 'center' });
        }

        // Final signature line
        if (currentY > 230) { doc.addPage(); currentY = 50; } else { currentY += 20; }
        doc.line(15, currentY + 20, 80, currentY + 20);
        doc.setFontSize(10);
        doc.text(p.doctor_name || "Consultant Psychiatrist", 15, currentY + 26);
        doc.text("Department of Behavioral Sciences", 15, currentY + 31);

        doc.save(`Prescription_${p.uhid}_${new Date(p.created_at).getTime()}.pdf`);
    };

    // No initial loading, only loading during search

    return (
        <div className="doctor-prescriptions">
            <h2 className="doctor-page-title">Prescription History</h2>
            <p className="doctor-emr-subtitle">View and manage all prescriptions issued by you.</p>

            <div className="doctor-card" style={{ marginBottom: "1.5rem" }}>
                <div className="doctor-search-bar" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <FiSearch style={{ color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder="Search by UHID, medicine, or patient name..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }}
                    />
                </div>
            </div>

            <div className="prescriptions-list">
                {!hasSearched ? (
                    <div className="doctor-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <FiSearch style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                        <p style={{ color: '#64748b' }}>Search for a patient by UHID or name to view prescription history.</p>
                    </div>
                ) : loading ? (
                    <div className="doctor-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: '#64748b' }}>Searching...</p>
                    </div>
                ) : filteredPrescriptions.length === 0 ? (
                    <div className="doctor-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: '#64748b' }}>No prescriptions found matching your search.</p>
                    </div>
                ) : (
                    filteredPrescriptions.map((p) => (
                        <div key={p.id} className="doctor-card prescription-item" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--doc-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--doc-text)', fontSize: '1.1rem' }}>{p.patient_name || "Patient"}</span>
                                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>({p.uhid})</span>
                                            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>
                                                <FiCalendar style={{ marginRight: '4px' }} />
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                                        <FiUser /> <span>By: {p.doctor_name || "Self"}</span>
                                    </div>
                                </div>
                                <button
                                    className="doctor-btn doctor-btn--secondary doctor-btn--sm"
                                    onClick={() => handlePrint(p)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <FiPrinter /> Print
                                </button>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                                            <th style={{ paddingBottom: '8px' }}>Medicine</th>
                                            <th style={{ paddingBottom: '8px' }}>Dose</th>
                                            <th style={{ paddingBottom: '8px' }}>Frequency</th>
                                            <th style={{ paddingBottom: '8px' }}>Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(p.medications || []).map((m, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx === p.medications.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px 0', fontWeight: '500' }}>{m.drug_name}</td>
                                                <td style={{ padding: '8px 0' }}>{m.dose}</td>
                                                <td style={{ padding: '8px 0' }}>{m.frequency}</td>
                                                <td style={{ padding: '8px 0' }}>{m.duration}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {p.notes && (
                                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>
                                    <strong>Notes:</strong> {p.notes}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default DoctorPrescriptions;
