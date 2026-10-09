import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiX, FiPrinter, FiDownload, FiFileText, FiActivity, FiTarget } from 'react-icons/fi';
import BillingReceipt from './receptionist/BillingReceipt';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import swastikLogo from '../assets/swastiklogo.png';
import './PortalStyles.css';

const PortalMedicalRecords = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'therapy');
    const [history, setHistory] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const savedUser = JSON.parse(localStorage.getItem('portal_user'));
            if (!savedUser) {
                navigate('/patient-portal/login');
                return;
            }
            setUser(savedUser);
            const uhid = savedUser.username || savedUser.uhid || savedUser.patientId;

            try {
                const { api } = await import('../api/service');
                const [clinicalResponse, recordResponse, appointmentResponse, billingResponse] = await Promise.all([
                    api.getClinicalHistory(uhid),
                    api.getPatientRecord(uhid),
                    api.getAppointments(uhid),
                    api.getBillsByPatient(uhid)
                ]);

                setHistory(clinicalResponse || []);
                setDocuments(recordResponse?.documents || []);
                setAppointments(appointmentResponse || []);
                setBills(billingResponse || []);
            } catch (err) {
                console.error('Error fetching records:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const handleDownloadPlan = (record) => {
        const doc = new jsPDF();
        const d = record.data || {};
        const now = new Date(record.created_at).toLocaleDateString();

        // Branding
        try { doc.addImage(swastikLogo, 'PNG', 15, 10, 25, 25); } catch (e) { }
        doc.setFontSize(20);
        doc.setTextColor(13, 148, 136);
        doc.text("SWASTIK HOSPITAL", 45, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Personalized Therapy & Recovery Plan", 45, 26);
        doc.line(15, 38, 195, 38);

        // Patient Detail
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 42, 180, 20, 'F');
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`PATIENT: ${user?.full_name?.toUpperCase() || 'PATIENT'}`, 20, 50);
        doc.text(`RECORD DATE: ${now}`, 120, 50);
        doc.text(`UHID: ${user?.username || user?.uhid}`, 20, 56);

        // Plan Content
        doc.setFontSize(14);
        doc.setTextColor(13, 148, 136);
        doc.text("THERAPY GOALS & STRATEGY", 15, 75);
        doc.line(15, 77, 80, 77);

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text("Short Term Goals:", 15, 85);
        doc.setFont(undefined, 'normal');
        const stGoals = doc.splitTextToSize(d.short_term_goals || d.shortTermGoals || "As per clinical observation", 150);
        doc.text(stGoals, 50, 85);

        let nextY = 85 + (stGoals.length * 5) + 10;
        doc.setFont(undefined, 'bold');
        doc.text("Long Term Goals:", 15, nextY);
        doc.setFont(undefined, 'normal');
        const ltGoals = doc.splitTextToSize(d.long_term_goals || d.longTermGoals || "Sustainable recovery", 150);
        doc.text(ltGoals, 50, nextY);

        nextY += (ltGoals.length * 5) + 10;
        doc.setFont(undefined, 'bold');
        doc.text("Therapy Modalities:", 15, nextY);
        doc.setFont(undefined, 'normal');
        doc.text(Array.isArray(d.therapy_modalities) ? d.therapy_modalities.join(", ") : (d.therapyModalities || "Regular Counseling"), 50, nextY);

        nextY += 15;
        doc.setFontSize(14);
        doc.setTextColor(13, 148, 136);
        doc.text("MEDICATIONS (If any)", 15, nextY);

        // If we have meds in history, show them
        const meds = history.filter(h => h.type === 'Medication' || h.type === 'Prescription');
        const medRows = meds.length ? meds.map(m => [m.data?.drug || m.data?.drug_name, m.data?.dose, m.data?.frequency]) : [["No specific medications in this plan", "-", "-"]];

        doc.autoTable({
            startY: nextY + 5,
            head: [["Medication", "Dose", "Frequency"]],
            body: medRows,
            theme: 'striped',
            headStyles: { fillColor: [13, 148, 136] }
        });

        doc.save(`Therapy_Plan_${now.replace(/\//g, '-')}.pdf`);
    };

    if (!user || loading) return <div className="portal-sub-page"><p>Loading your health records...</p></div>;

    // Extract daily routine from latest clinical record (prioritizing explicit Daily Routine type)
    const latestRoutine = history.find(record =>
        record.type === 'Daily Routine' || record.data?.dailyRoutine || record.data?.soap?.daily_routine
    );
    const dailyRoutineText = latestRoutine?.type === 'Daily Routine'
        ? latestRoutine.data?.daily_routine
        : (latestRoutine?.data?.dailyRoutine || latestRoutine?.data?.soap?.daily_routine);

    const handleDownloadRoutine = () => {
        if (!dailyRoutineText) return;
        const doc = new jsPDF();
        const now = new Date(latestRoutine.created_at).toLocaleDateString();

        // Header Branding
        try { doc.addImage(swastikLogo, 'PNG', 15, 10, 25, 25); } catch (e) { }
        doc.setFontSize(22);
        doc.setTextColor(13, 148, 136);
        doc.text("SWASTIK HOSPITAL", 45, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Center for Mental Health & Behavioral Sciences", 45, 26);
        doc.line(15, 38, 195, 38);

        // Title
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 42, 180, 15, 'F');
        doc.setFontSize(12);
        doc.setTextColor(13, 148, 136);
        doc.setFont(undefined, 'bold');
        doc.text("PERSONALIZED DAILY RECOVERY ROUTINE", 105, 52, { align: 'center' });

        // Patient Details
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont(undefined, 'normal');
        doc.text(`Patient: ${user?.full_name?.toUpperCase()}`, 15, 65);
        doc.text(`UHID: ${user?.username || user?.uhid}`, 15, 71);
        doc.text(`Issued Date: ${now}`, 150, 65);

        // Content
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        const splitText = doc.splitTextToSize(dailyRoutineText, 170);
        doc.text(splitText, 15, 85);

        // Footer
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 250;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("This is an automated routine generated by your consultant for therapeutic purposes.", 105, finalY, { align: 'center' });
        doc.text("Swastik Hospital | Contact: +91 9158300801", 105, finalY + 5, { align: 'center' });

        doc.save(`Daily_Routine_${now.replace(/\//g, '-')}.pdf`);
    };

    return (
        <div className="portal-sub-page">
            <div className="portal-header">
                <h2>Health History & Records</h2>
                <p>Access your complete medical journey, including appointments, clinical summaries, and reports.</p>
            </div>

            <div className="portal-auth-tabs" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', maxWidth: '800px', overflowX: 'auto' }}>
                <button
                    className={`portal-auth-tab ${activeTab === 'reports' ? 'portal-auth-tab--active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                >
                    Reports
                </button>
                <button
                    className={`portal-auth-tab ${activeTab === 'therapy' ? 'portal-auth-tab--active' : ''}`}
                    onClick={() => setActiveTab('therapy')}
                >
                    Therapy Plan
                </button>
                <button
                    className={`portal-auth-tab ${activeTab === 'slots' ? 'portal-auth-tab--active' : ''}`}
                    onClick={() => setActiveTab('slots')}
                >
                    Slot History
                </button>
                <button
                    className={`portal-auth-tab ${activeTab === 'routine' ? 'portal-auth-tab--active' : ''}`}
                    onClick={() => setActiveTab('routine')}
                >
                    Daily Routine
                </button>
                <button
                    className={`portal-auth-tab ${activeTab === 'billing' ? 'portal-auth-tab--active' : ''}`}
                    onClick={() => setActiveTab('billing')}
                >
                    Billing
                </button>
            </div>

            <div className="portal-table-container portal-reports-table" style={{ marginTop: '2rem' }}>
                {activeTab === 'reports' && (
                    <table className="portal-data-table">
                        <thead>
                            <tr>
                                <th>Date Generated</th>
                                <th>Document Name</th>
                                <th>Category</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc._id}>
                                    <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: 600 }}>📄 {doc.document_name}</td>
                                    <td><span className="portal-report-category">{doc.category}</span></td>
                                    <td>
                                        <button type="button" className="portal-action-btn portal-action-btn--secondary">View</button>
                                    </td>
                                </tr>
                            ))}
                            {documents.length === 0 && (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No documents found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {activeTab === 'therapy' && (
                    <div className="portal-therapy-container">
                        {history.filter(h => h.type === 'Treatment Plan' || h.type === 'Consultation').length > 0 ? (
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {history.filter(h => h.type === 'Treatment Plan' || h.type === 'Consultation').slice(0, 3).map(record => (
                                    <div key={record._id} style={{
                                        background: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        padding: '1.5rem',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Plan Issued: {new Date(record.created_at).toLocaleDateString()}
                                                </span>
                                                <h3 style={{ margin: '4px 0 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FiTarget style={{ color: '#0d9488' }} /> Clinical Recovery Plan
                                                </h3>
                                            </div>
                                            <button
                                                className="portal-action-btn"
                                                style={{ background: '#0d9488', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                onClick={() => handleDownloadPlan(record)}
                                            >
                                                <FiDownload /> Download Plan
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                                                <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FiActivity size={14} /> Short Term Goals
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.5' }}>
                                                    {record.data?.short_term_goals || record.data?.shortTermGoals || "Focused clinical recovery and symptom stabilization."}
                                                </p>
                                            </div>
                                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                                                <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FiTarget size={14} /> Therapy Modalities
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.5' }}>
                                                    {Array.isArray(record.data?.therapy_modalities) ? record.data.therapy_modalities.join(", ") : (record.data?.therapyModalities || "Standard Psychiatric Counseling")}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
                                            <strong>Recommendation:</strong> Follow clinical guidelines provided during the session. Next review scheduled as per hospital protocol.
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                                <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>No Therapy Plans Yet</h3>
                                <p style={{ color: '#64748b', margin: 0 }}>Once your doctor creates a clinical plan, it will appear here for you to view and download.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'slots' && (
                    <table className="portal-data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Type</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.length > 0 ? appointments.map(app => (
                                <tr key={app._id}>
                                    <td>{app.appointment_date}</td>
                                    <td>{app.appointment_time}</td>
                                    <td>{app.type || 'Standard'}</td>
                                    <td>
                                        <span className={`status-badge status-badge--${app.status}`}>
                                            {app.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No appointment history found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {activeTab === 'routine' && (
                    <div className="portal-routine-container" style={{
                        padding: '2rem',
                        background: '#fff',
                        borderRadius: '24px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ color: '#0d9488', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FiActivity /> Suggested Daily Routine
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                    Tailored clinical plan for your sustainable recovery
                                </p>
                            </div>
                            {dailyRoutineText && (
                                <button
                                    className="portal-action-btn"
                                    onClick={handleDownloadRoutine}
                                    style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px' }}
                                >
                                    <FiDownload /> Download PDF
                                </button>
                            )}
                        </div>

                        {dailyRoutineText ? (
                            <div style={{
                                padding: '1.5rem',
                                background: '#f8fafc',
                                borderRadius: '16px',
                                border: '1px dashed #cbd5e1',
                                whiteSpace: 'pre-wrap',
                                color: '#334155',
                                lineHeight: '1.8',
                                fontSize: '1.05rem',
                                minHeight: '200px'
                            }}>
                                {dailyRoutineText}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No daily routine has been suggested by your doctor yet.</p>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '12px', alignItems: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                            <div style={{ fontSize: '1.2rem' }}>💡</div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                                <strong>Tip:</strong> Following a consistent daily routine significantly aids in behavioral stabilization and cognitive recovery.
                                {latestRoutine && ` (Last updated: ${new Date(latestRoutine.created_at).toLocaleDateString()})`}
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <table className="portal-data-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Billing Date</th>
                                <th>Service Summary</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.length > 0 ? bills.map(bill => (
                                <tr key={bill.id || bill._id}>
                                    <td style={{ fontWeight: 700, color: '#0d9488' }}>{bill.invoice_number || bill.bill_id}</td>
                                    <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {bill.items && bill.items.length > 0
                                            ? (bill.items.length > 1 ? `${bill.items[0].description} + ${bill.items.length - 1} more` : bill.items[0].description)
                                            : "Case Paper / Consultation"}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>₹{bill.total || bill.amount}</td>
                                    <td>
                                        <span className={`status-badge status-badge--${(bill.status || 'unpaid').toLowerCase()}`}>
                                            {bill.status || 'unpaid'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="portal-action-btn"
                                            onClick={() => setSelectedBill({
                                                ...bill,
                                                patient_name: user.full_name || user.name || "Patient"
                                            })}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <div style={{ color: '#64748b' }}>
                                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>💳</span>
                                        <p style={{ margin: 0, fontWeight: 500 }}>No billing records found.</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: '#fdf2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b', lineHeight: '1.4' }}>
                    <strong>Confidentiality Notice:</strong> All medical records are encrypted and strictly confidential. If you notice any discrepancy, please contact our administrative desk immediately.
                </p>
            </div>

            {/* Receipt Modal */}
            {selectedBill && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '2rem'
                }}>
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '700px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        background: '#fff',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <button
                            onClick={() => setSelectedBill(null)}
                            style={{
                                position: 'absolute',
                                right: '1.5rem',
                                top: '1.5rem',
                                background: '#f1f5f9',
                                border: 'none',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#64748b',
                                transition: 'all 0.2s',
                                zIndex: 10
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            <FiX size={24} />
                        </button>
                        <div style={{ padding: '1rem' }}>
                            <BillingReceipt invoice={selectedBill} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalMedicalRecords;
