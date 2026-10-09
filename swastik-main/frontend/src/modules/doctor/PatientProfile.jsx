import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    FiArrowLeft, FiActivity, FiUser, FiFileText, FiTrendingUp, FiTrendingDown,
    FiAlertCircle, FiCheckCircle, FiPlusSquare, FiLayers, FiClipboard, FiClock
} from 'react-icons/fi';
import { api } from "../../api/service";
import EMR from "./components/EMR";
import RoundingLog from "./components/RoundingLog";
import ClinicalTimeline from "./components/ClinicalTimeline";
import {
    AddNoteModal, AddVitalsModal, AddMedicationModal,
    OrderLabModal, AddDiagnosisModal, DischargeRecommendationModal
} from "./components/RoundingModals";
import { VitalsPulse, ActiveOrders, LatestSOAPSummary, ClinicalImpression } from "./components/WardBoardWidgets";
import "./doctor.css";
import LabReportModal from "../lab/LabReportModal";

function WardDashboard({ summary, timeline, uhid, admissionId, onRefresh, onViewReport }) {
    const pendingLabs = (summary?.lab_orders || []).filter(o => o.status !== 'REPORT_READY' && o.status !== 'CANCELLED');
    const reports = (summary?.lab_orders || []).filter(o => o.status === 'REPORT_READY' && o.report_sent_to_doctor);

    return (
        <div className="ward-round-board">
            {/* Top Row: Mission Critical Info */}
            <div className="clinical-grid-4">
                <VitalsPulse vitals={summary?.vitals} />
                <ClinicalImpression diagnosis={summary?.diagnosis} risk={summary?.risk} />
                <LatestSOAPSummary note={summary?.latest_soap} />
                <ActiveOrders medications={summary?.medications} labOrders={summary?.lab_orders} />
            </div>

            {/* Middle Row: Progress and Timeline */}
            <div className="clinical-main-columns">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="doctor-card" style={{ padding: '2rem', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                            <FiClipboard style={{color: 'var(--doc-primary)'}} />
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Rounding Progress Log</h3>
                        </div>
                        <RoundingLog notes={summary?.notes} />
                    </div>

                    {/* Pending Labs Live Status */}
                    <div className="doctor-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                                <FiLayers color="var(--doc-primary)" /> Pending Lab Investigations
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>
                                <span className="live-indicator"></span> LIVE
                            </div>
                        </div>
                        {pendingLabs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                                <FiLayers size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>No pending investigations at this moment.</p>
                            </div>
                        ) : (
                            <div className="lab-card-grid">
                                {pendingLabs.map(order => (
                                    <div key={order.request_id} className="lab-order-card">
                                        <div className="lab-order-card__header">
                                            <span className="lab-order-card__id">{order.request_id}</span>
                                            <span className={`lab-status-pill status--${order.status.toLowerCase()}`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="lab-order-card__content">
                                            <div className="lab-order-card__tests">
                                                <strong style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Ordered Tests</strong>
                                                {(order.tests_ordered || []).join(', ')}
                                            </div>
                                        </div>
                                        <div className="lab-order-card__footer">
                                            <FiClock size={12} />
                                            <span>Ordered: {new Date(order.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Lab Report History */}
                    <div className="doctor-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                                <FiFileText color="#3b82f6" /> Lab Report History
                            </h3>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Sorted by Date/Time</div>
                        </div>
                        {reports.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                                <FiFileText size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>No validated reports available yet.</p>
                            </div>
                        ) : (
                            <div className="lab-reports-list">
                                {reports.sort((a,b) => new Date(b.report_generated_at || b.updated_at) - new Date(a.report_generated_at || a.updated_at)).map(report => (
                                    <div key={report.request_id} className="lab-report-item">
                                        <div className="report-date-box">
                                            <span className="report-date">{new Date(report.report_generated_at || report.updated_at).toLocaleDateString()}</span>
                                            <span className="report-time">{new Date(report.report_generated_at || report.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="report-id">
                                            {report.request_id}
                                        </div>
                                        <div className="report-tests" title={(report.tests_ordered || []).join(', ')}>
                                            {(report.tests_ordered || []).join(', ')}
                                        </div>
                                        <div className="report-author">
                                            <FiUser size={14} />
                                            {report.report_generated_by || report.shared_to_doctor_by || "Lab Desk"}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <button 
                                                onClick={() => onViewReport(report.request_id)}
                                                className="doctor-btn doctor-btn--secondary"
                                                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <FiFileText size={14} /> View Results
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="timeline-column">
                    <div className="doctor-card" style={{ padding: '1.5rem', background: '#f8fafc', height: '100%', overflowY: 'auto', maxHeight: '550px' }}>
                        <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiClock /> Clinical Timeline
                        </h4>
                        <ClinicalTimeline events={timeline} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PatientProfile() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { patientId, patientName, admissionId, tokenNumber, appointmentId } = state || {};

    const [activeView, setActiveView] = useState("dashboard"); // dashboard, emr
    const [summary, setSummary] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal states
    const [modals, setModals] = useState({
        note: false, vitals: false, medication: false, lab: false, diagnosis: false, discharge: false, report: false
    });
    const [selectedRequestId, setSelectedRequestId] = useState(null);

    const fetchData = useCallback(async () => {
        if (!patientId || !admissionId) return;
        try {
            setLoading(prevState => (summary ? false : true));
            const [summaryData, timelineData] = await Promise.all([
                api.getWardSummary(patientId, admissionId),
                api.getClinicalTimeline(patientId, admissionId)
            ]);
            setSummary(summaryData);
            setTimeline(timelineData);
        } catch (err) {
            console.error("Failed to load clinical data:", err);
        } finally {
            setLoading(false);
        }
    }, [patientId, admissionId, summary]);

    useEffect(() => {
        fetchData();
        // Live update interval for lab status
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const toggleModal = (key, val) => setModals(prev => ({ ...prev, [key]: val }));

    const handleQuickAction = async (type, data) => {
        setSaving(true);
        try {
            if (type === 'note') {
                const payload = {
                    admission_id: admissionId, subjective: data.subjective, objective: data.objective,
                    assessment: data.assessment, plan: data.plan, role_tag: "Medical Doctor"
                };
                await api.createSessionNote(patientId, payload);
            } else if (type === 'vitals') {
                await api.addVitals(patientId, { admission_id: admissionId, ...data });
            } else if (type === 'medication') {
                // Bulk prescriptions
                const promises = data.map(med => api.addMedication(patientId, {
                    admission_id: admissionId, drug_name: med.drugName, dose: med.dose,
                    frequency: med.frequency, route: med.route, 
                    start_date: med.startDate, end_date: med.endDate,
                    status: "Active"
                }));
                await Promise.all(promises);
            } else if (type === 'lab') {
                // Formal lab request with multiple tests
                await api.createLabTestRequest({
                    patient_id: patientId,
                    admission_id: admissionId,
                    tests_ordered: data.testsOrdered,
                    clinical_notes: data.instructions,
                    priority: data.priority
                });
            } else if (type === 'diagnosis') {
                await api.saveDiagnosis(patientId, {
                    admission_id: admissionId, primary_diagnosis: data.primary,
                    differential: data.secondary, severity: data.severity, specifier: data.specifier
                });
            } else if (type === 'discharge') {
                await api.updateEmrAdmission(admissionId, {
                    clinical_status: "Ready for Discharge",
                    discharge_instructions: data.instructions,
                    discharge_condition: data.condition,
                    follow_up_instructions: data.followUp
                });
            }

            toggleModal(type, false);
            fetchData(); // Refresh all data
        } catch (err) {
            alert("Action failed: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!patientId || !admissionId) return <div className="doctor-dashboard" style={{ padding: '2rem' }}><p>Missing patient context. Return to dashboard.</p></div>;

    const getStatusClass = (status) => {
        if (!status) return "recep-status-observation";
        switch (status) {
            case 'Critical': return 'recep-status-critical';
            case 'Ready for Discharge': return 'recep-status-discharge';
            case 'Stable': return 'recep-status-stable';
            default: return 'recep-status-observation';
        }
    };

    return (
        <div className="doctor-dashboard" style={{ background: '#f8fafc', minHeight: '100vh', padding: '1.25rem' }}>
            <div className="doctor-header" style={{ maxWidth: '1440px', margin: '0 auto', marginBottom: '1rem', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <button onClick={() => navigate(-1)} className="doctor-btn doctor-btn--secondary" style={{ marginBottom: '1rem', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}>
                    <FiArrowLeft /> Ward List
                </button>

                {/* High-Fidelity Clinical Ribbon */}
                <div className="doctor-patient-ribbon">
                    <div className="doctor-patient-ribbon__info">
                        <div className="doctor-patient-ribbon__avatar">
                            <FiUser size={32} />
                        </div>
                        <div>
                            <div className="doctor-patient-ribbon__name-row">
                                <h1 className="doctor-patient-ribbon__name">{patientName}</h1>
                                <span className={`recep-status ${getStatusClass(summary?.admission?.clinical_status)}`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                                    {summary?.admission?.clinical_status || "UNDER OBSERVATION"}
                                </span>
                            </div>
                            <div className="doctor-patient-ribbon__details">
                                <span>UHID: <strong>{patientId}</strong></span>
                                {tokenNumber && <span>Token: <strong style={{ color: 'var(--doc-primary)' }}>{tokenNumber}</strong></span>}
                                {admissionId ? (
                                    <>
                                        <span>Ward/Bed: <strong>{summary?.admission?.ward || "--"} / {summary?.admission?.bed || "--"}</strong></span>
                                        <span>Admitted: <strong>{summary?.admission?.admission_date ? new Date(summary.admission.admission_date).toLocaleDateString() : "--"}</strong></span>
                                    </>
                                ) : (
                                    <span>Type: <strong>OPD Consultation</strong></span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '14px', gap: '4px', border: '1px solid #e2e8f0' }}>
                            <button
                                className="doctor-btn" onClick={() => setActiveView('dashboard')}
                                style={{
                                    background: activeView === 'dashboard' ? 'white' : 'transparent',
                                    color: activeView === 'dashboard' ? 'var(--doc-primary)' : '#64748b',
                                    border: 'none',
                                    fontSize: '0.8rem',
                                    padding: '8px 18px',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    boxShadow: activeView === 'dashboard' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                Board
                            </button>
                            <button
                                className="doctor-btn" onClick={() => setActiveView('emr')}
                                style={{
                                    background: activeView === 'emr' ? 'white' : 'transparent',
                                    color: activeView === 'emr' ? 'var(--doc-primary)' : '#64748b',
                                    border: 'none',
                                    fontSize: '0.8rem',
                                    padding: '8px 18px',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    boxShadow: activeView === 'emr' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                Full EMR
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="patient-profile-main">
                <div className="main-content">
                    {loading ? (
                        <div className="doctor-card" style={{ padding: '6rem', textAlign: 'center' }}>Loading Clinical Cockpit...</div>
                    ) : activeView === "dashboard" ? (
                        <WardDashboard 
                            summary={summary} 
                            timeline={timeline} 
                            uhid={patientId} 
                            admissionId={admissionId}
                            onRefresh={fetchData} 
                            onViewReport={(rid) => {
                                setSelectedRequestId(rid);
                                toggleModal('report', true);
                            }}
                        />
                    ) : (
                        <EMR
                            patientId={patientId} patientName={patientName}
                            admissionId={admissionId} admission={summary?.admission}
                            onContextRefresh={fetchData}
                            canEdit={true}
                        />
                    )}
                </div>

                {/* Quick Action Clinical Command Panel */}
                <aside>
                    <div className="clinical-command-panel">
                        <div className="clinical-command-card">
                            <h4 className="clinical-command-title">Clinical Command</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button onClick={() => toggleModal('note', true)} className="clinical-command-btn clinical-command-btn--note">
                                    <FiFileText size={18} /> Add SOAP Note
                                </button>
                                <button onClick={() => toggleModal('vitals', true)} className="clinical-command-btn clinical-command-btn--vitals">
                                    <FiActivity size={18} /> Record Vitals
                                </button>
                                <button onClick={() => toggleModal('medication', true)} className="clinical-command-btn clinical-command-btn--med">
                                    <FiPlusSquare size={18} /> Prescribe
                                </button>
                                <button onClick={() => toggleModal('lab', true)} className="clinical-command-btn clinical-command-btn--lab">
                                    <FiLayers size={18} /> Order Lab Test
                                </button>
                                <button onClick={() => toggleModal('diagnosis', true)} className="clinical-command-btn clinical-command-btn--diag">
                                    <FiClipboard size={18} /> Update Diagnosis
                                </button>
                            </div>
                        </div>

                        <div className="clinical-rounding-card">
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--doc-primary-hover)', fontWeight: 800, textTransform: 'uppercase' }}>Rounding Plan</h4>
                            <button
                                onClick={() => toggleModal('discharge', true)}
                                className="doctor-btn doctor-btn--primary"
                                style={{ width: '100%', fontWeight: 700, borderRadius: '12px' }}
                            >
                                Recommend Discharge
                            </button>
                            <p style={{ fontSize: '0.75rem', color: 'var(--doc-primary)', marginTop: '10px', textAlign: 'center', fontWeight: 500 }}>
                                Status: {summary?.admission?.clinical_status === 'Ready for Discharge' ? 'PRE-DISCHARGE' : 'IN WARD ROUND'}
                            </p>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Modals Container */}
            <AddNoteModal isOpen={modals.note} onClose={() => toggleModal('note', false)} onSave={d => handleQuickAction('note', d)} saving={saving} />
            <AddVitalsModal isOpen={modals.vitals} onClose={() => toggleModal('vitals', false)} onSave={d => handleQuickAction('vitals', d)} saving={saving} />
            <AddMedicationModal isOpen={modals.medication} onClose={() => toggleModal('medication', false)} onSave={d => handleQuickAction('medication', d)} saving={saving} />
            <OrderLabModal isOpen={modals.lab} onClose={() => toggleModal('lab', false)} onSave={d => handleQuickAction('lab', d)} saving={saving} />
            <AddDiagnosisModal isOpen={modals.diagnosis} onClose={() => toggleModal('diagnosis', false)} onSave={d => handleQuickAction('diagnosis', d)} saving={saving} />
            <DischargeRecommendationModal isOpen={modals.discharge} onClose={() => toggleModal('discharge', false)} onSave={d => handleQuickAction('discharge', d)} saving={saving} />
            
            <LabReportModal 
                open={modals.report}
                requestId={selectedRequestId}
                onClose={() => toggleModal('report', false)}
                showSaveAction={false}
            />
        </div>
    );
}
