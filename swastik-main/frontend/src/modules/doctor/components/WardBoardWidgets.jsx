import React from "react";
import { FiActivity, FiClipboard, FiLayers, FiFileText, FiTrendingUp, FiTrendingDown, FiClock, FiPlusSquare, FiAlertCircle } from 'react-icons/fi';

export const VitalsPulse = ({ vitals }) => {
    const latest = vitals?.[0] || {};
    const prev = vitals?.[1] || {};

    const getTrend = (curr, prev) => {
        if (!curr || !prev) return null;
        if (curr > prev) return <FiTrendingUp style={{ color: '#ef4444', fontSize: '10px' }} />;
        if (curr < prev) return <FiTrendingDown style={{ color: '#10b981', fontSize: '10px' }} />;
        return <span style={{ color: '#94a3b8', fontSize: '10px' }}>=</span>;
    };

    return (
        <div className="ward-widget vitals-pulse">
            <div className="ward-widget-header">
                <FiActivity /> Live Vitals Pulse
            </div>
            <div className="vitals-grid">
                <div className="vital-box">
                    <span className="vital-label">BP</span>
                    <div className="vital-value">{latest.bp_systolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : "--/--"}</div>
                    <span className="vital-unit">mmHg</span>
                </div>
                <div className="vital-box">
                    <span className="vital-label">HR</span>
                    <div className="vital-value">
                        {latest.hr || "--"} {getTrend(latest.hr, prev.hr)}
                    </div>
                    <span className="vital-unit">bpm</span>
                </div>
                <div className="vital-box pulse-active">
                    <span className="vital-label">SpO2</span>
                    <div className="vital-value" style={{ color: latest.spo2 < 94 ? '#ef4444' : 'inherit' }}>
                        {latest.spo2 ? `${latest.spo2}%` : "--%"}
                    </div>
                    <span className="vital-unit">O2 Sat</span>
                </div>
                <div className="vital-box">
                    <span className="vital-label">TEMP</span>
                    <div className="vital-value">{latest.temp || "--"}°</div>
                    <span className="vital-unit">Celsius</span>
                </div>
            </div>
        </div>
    );
};

export const ActiveOrders = ({ medications, labOrders }) => {
    const activeMeds = medications?.filter(m => m.status === 'Active').slice(0, 4) || [];
    const pendingLabs = labOrders?.filter(l => l.status !== 'REPORT_READY' && l.status !== 'CANCELLED').slice(0, 4) || [];

    return (
        <div className="ward-widget orders-summary">
            <div className="orders-section">
                <div className="ward-widget-header"><FiPlusSquare /> Active Medications</div>
                <div className="order-list">
                    {activeMeds.length > 0 ? activeMeds.map((m, i) => (
                        <div key={i} className="order-item">
                            <span className="order-name">{m.drug_name}</span>
                            <span className="order-meta">{m.dose} • {m.frequency}</span>
                        </div>
                    )) : <div className="no-data">No active prescriptions</div>}
                </div>
            </div>
            <div className="orders-section">
                <div className="ward-widget-header"><FiLayers /> Pending Labs</div>
                <div className="order-list">
                    {pendingLabs.length > 0 ? pendingLabs.map((l, i) => (
                        <div key={i} className="order-item">
                            <span className="order-name">{l.test_name || l.tests?.join(', ')}</span>
                            <span className="order-badge">{l.priority || 'Routine'}</span>
                        </div>
                    )) : <div className="no-data">No pending lab orders</div>}
                </div>
            </div>
        </div>
    );
};

export const LatestSOAPSummary = ({ note }) => {
    if (!note) return (
        <div className="ward-widget soap-summary empty">
            <div className="ward-widget-header"><FiFileText /> Latest Clinical Assessment</div>
            <div className="no-data">No clinical notes recorded for this admission.</div>
        </div>
    );

    return (
        <div className="ward-widget soap-summary">
            <div className="ward-widget-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <FiFileText /> Latest SOAP Note
                </div>
                <span className="note-date">{new Date(note.session_date).toLocaleDateString()}</span>
            </div>
            <div className="soap-content">
                <div className="soap-block">
                    <label>Assessment</label>
                    <p>{note.assessment || "No assessment recorded"}</p>
                </div>
                <div className="soap-block highlight">
                    <label>Plan</label>
                    <p>{note.plan || "No plan recorded"}</p>
                </div>
            </div>
        </div>
    );
};

export const ClinicalImpression = ({ diagnosis, risk }) => {
    return (
        <div className="ward-widget clinical-impression">
            <div className="ward-widget-header"><FiClipboard /> Clinical Impression</div>
            <div className="diagnosis-highlight">
                {diagnosis?.primary_diagnosis 
                    ? (typeof diagnosis.primary_diagnosis === 'object' 
                        ? `[${diagnosis.primary_diagnosis.code}] ${diagnosis.primary_diagnosis.title}` 
                        : diagnosis.primary_diagnosis) 
                    : "Awaiting Diagnosis"}
            </div>
            <div className="risk-ribbon">
                <div className="risk-item">
                    <label>Self</label>
                    <span className={`risk-tag ${risk?.risk_to_self?.toLowerCase()}`}>{risk?.risk_to_self || "Low"}</span>
                </div>
                <div className="risk-item">
                    <label>Others</label>
                    <span className={`risk-tag ${risk?.risk_to_others?.toLowerCase()}`}>{risk?.risk_to_others || "Low"}</span>
                </div>
                <div className="risk-item">
                    <label>Elopement</label>
                    <span className={`risk-tag ${risk?.risk_to_vulnerability?.toLowerCase()}`}>{risk?.risk_to_vulnerability || "Low"}</span>
                </div>
            </div>
        </div>
    );
};
