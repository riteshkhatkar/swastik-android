import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiActivity, FiX, FiFileText, FiDownload, FiCreditCard, FiAlertTriangle } from 'react-icons/fi';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function DischargeDialog({ admission, onClose, onDischarge }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [treatmentGiven, setTreatmentGiven] = useState("");
    const [doctorNotes, setDoctorNotes] = useState("");
    const [condition, setCondition] = useState("Stable");
    const [followUp, setFollowUp] = useState("");

    // Billing Status
    const [billingLoading, setBillingLoading] = useState(true);
    const [totalDue, setTotalDue] = useState(0);
    const [billDetails, setBillDetails] = useState(null);

    useEffect(() => {
        const fetchBillingStatus = async () => {
            setBillingLoading(true);
            try {
                const { api } = await import("../../api/service");
                // Fetch all bills for this patient
                const bills = await api.getBillsByPatient(admission.uhid);

                // Calculate total pending amount
                let pendingAmount = 0;
                if (bills && bills.length > 0) {
                    bills.forEach(bill => {
                        pendingAmount += (bill.due_amount || 0);
                    });
                }

                setTotalDue(pendingAmount);

                // Estimate stay duration for summary
                const adate = new Date(admission.admission_date);
                const ddate = new Date();
                const diffTime = Math.abs(ddate - adate);
                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

                setBillDetails({
                    days,
                    pendingAmount,
                    hasBills: bills && bills.length > 0
                });
            } catch (err) {
                console.error("Failed to fetch billing status:", err);
                // Fallback to safe defaults if network error
                setTotalDue(0);
            } finally {
                setBillingLoading(false);
            }
        };

        if (admission?.uhid) {
            fetchBillingStatus();
        }
    }, [admission]);

    const downloadDischargeSummary = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(13, 148, 136);
        doc.text("SWASTIK HOSPITAL", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Psychiatric Care & Rehabilitation Center", 105, 26, { align: "center" });
        doc.text("OFFICIAL DISCHARGE SUMMARY", 105, 32, { align: "center" });

        // Patient Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Patient Name: ${admission.patient_name}`, 20, 45);
        doc.text(`UHID: ${admission.uhid}`, 20, 52);
        doc.text(`Date of Admission: ${new Date(admission.admission_date).toLocaleDateString()}`, 120, 45);
        doc.text(`Date of Discharge: ${new Date().toLocaleDateString()}`, 120, 52);
        doc.line(20, 58, 190, 58);

        // Clinical Content
        doc.setFontSize(14);
        doc.text("Clinical Summary", 20, 68);
        doc.setFontSize(10);
        doc.text("Diagnosis:", 20, 78);
        doc.text(admission.diagnosis || "Psychiatric Care", 50, 78);

        doc.text("Treatment Administered:", 20, 88);
        const splitTreatment = doc.splitTextToSize(treatmentGiven, 160);
        doc.text(splitTreatment, 20, 95);

        doc.text("Condition at Discharge:", 20, 130);
        doc.text(condition, 65, 130);

        doc.setFontSize(14);
        doc.text("Follow-up Instructions", 20, 145);
        doc.setFontSize(10);
        doc.text(followUp || "Contact hospital for next appointment.", 20, 155);

        // Footer
        doc.setFontSize(8);
        doc.text("Authorized Medical Officer Signature", 150, 210);
        doc.line(140, 205, 195, 205);

        doc.save(`Discharge_Summary_${admission.uhid}.pdf`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (totalDue > 0) {
            alert("Cannot discharge patient while there are pending dues. Please settle the bills first.");
            return;
        }

        setLoading(true);
        try {
            const { api } = await import("../../api/service");
            const payload = {
                admission_id: admission._id || admission.id,
                treatment_given: treatmentGiven,
                doctor_notes: doctorNotes,
                condition_at_discharge: condition,
                follow_up_instructions: followUp,
                discharge_date: new Date().toISOString()
            };
            await api.dischargePatient(payload);
            downloadDischargeSummary();
            setSuccessData(true);
            setTimeout(() => {
                onDischarge();
                onClose();
            }, 2000);
        } catch (err) {
            alert("Discharge failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <div className="recep-modal-overlay">
                <div className="recep-modal" style={{ textAlign: 'center', padding: '3rem' }}>
                    <FiCheckCircle style={{ fontSize: '4rem', color: '#10b981', marginBottom: '1rem' }} />
                    <h2>Patient Discharged!</h2>
                    <p>Discharge Summary generated and Room is now available.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="recep-modal-overlay">
            <div className="recep-modal" style={{ maxWidth: '800px' }}>
                <div className="recep-modal-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <h3><FiFileText /> Professional Discharge Workflow</h3>
                    <button onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit} className="recep-modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{admission.patient_name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>UHID: {admission.uhid} | Admitted: {new Date(admission.admission_date).toLocaleDateString()}</div>
                        </div>

                        <div className="recep-form-group">
                            <label>Treatment Given <span style={{ color: '#ef4444' }}>*</span></label>
                            <textarea value={treatmentGiven} onChange={(e) => setTreatmentGiven(e.target.value)} placeholder="Summary of medications, procedures, and improvement..." required style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '100px' }} />
                        </div>

                        <div className="recep-form-group">
                            <label>Condition at Discharge <span style={{ color: '#ef4444' }}>*</span></label>
                            <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <option value="Stable">Stable</option>
                                <option value="Improved">Improved</option>
                                <option value="Recovered">Recovered</option>
                                <option value="Transferred">Transferred</option>
                                <option value="DAMA">DAMA</option>
                            </select>
                        </div>

                        <div className="recep-form-group">
                            <label>Follow-up Instructions</label>
                            <input type="text" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="e.g. Visit Dr. Gupta on 25th March" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                        </div>
                    </div>

                    <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '20px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e' }}>
                            <FiCreditCard /> Billing & Clearance Status
                        </h4>

                        {billingLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e', padding: '1rem 0' }}>
                                <FiActivity className="spin" /> Verifying hospital accounts...
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                    <span style={{ color: '#92400e' }}>Stay Duration:</span>
                                    <span style={{ fontWeight: 700 }}>{billDetails?.days || "--"} Days</span>
                                </div>

                                {totalDue > 0 ? (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '1rem', marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48', fontWeight: 700, marginBottom: '0.5rem' }}>
                                            <FiAlertTriangle /> Outstanding Dues Found
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e11d48', marginBottom: '1rem' }}>
                                            ₹{totalDue.toLocaleString('en-IN')}
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: '#be123c', margin: '0 0 1rem 0' }}>
                                            The patient has an unpaid balance. Final discharge and room release cannot proceed until all dues are cleared.
                                        </p>
                                        <button
                                            type="button"
                                            className="recep-btn"
                                            style={{ background: '#e11d48', color: 'white', width: '100%' }}
                                            onClick={() => navigate('/receptionist/billing')}
                                        >
                                            Go to Billing Desk
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '1rem', marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 700, marginBottom: '0.5rem' }}>
                                            <FiCheckCircle /> Billing Cleared
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: '#047857', margin: 0 }}>
                                            All hospital dues have been settled. You may proceed with the final discharge and room release.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                type="submit"
                                className="recep-btn"
                                style={{
                                    background: totalDue > 0 ? '#94a3b8' : '#0d9488',
                                    color: 'white',
                                    border: 'none',
                                    padding: '1rem',
                                    width: '100%',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: totalDue > 0 ? 'not-allowed' : 'pointer'
                                }}
                                disabled={loading || billingLoading || totalDue > 0}
                            >
                                {loading ? <FiActivity className="spin" /> : <FiCheckCircle />} Finalize Official Discharge
                            </button>
                            <button type="button" className="recep-btn recep-btn-secondary" onClick={onClose} style={{ width: '100%' }}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
