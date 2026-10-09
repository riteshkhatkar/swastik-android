import React from "react";
import { FiActivity, FiFileText, FiPlusCircle, FiLayers, FiAlertCircle, FiClock, FiUser } from "react-icons/fi";

const ICON_MAP = {
    vitals: <FiActivity color="#10b981" />,
    note: <FiFileText color="#3b82f6" />,
    medication: <FiPlusCircle color="#8b5cf6" />,
    lab: <FiLayers color="#f59e0b" />,
    diagnosis: <FiAlertCircle color="#ef4444" />,
    history: <FiClock color="#64748b" />
};

function ClinicalTimeline({ events = [] }) {
    if (!events || events.length === 0) {
        return (
            <div className="doctor-card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <FiClock size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>No activity recorded yet for this patient.</p>
            </div>
        );
    }

    return (
        <div className="clinical-timeline" style={{ position: 'relative', paddingLeft: '1rem' }}>
            {/* Central Line */}
            <div style={{
                position: 'absolute',
                left: '23px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#e2e8f0',
                zIndex: 0
            }} />

            {events.map((event, idx) => (
                <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem', display: 'flex', gap: '1rem', zIndex: 1 }}>
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #e2e8f0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        flexShrink: 0
                    }}>
                        {ICON_MAP[event.type] || <FiClock />}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                                {event.display}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                                <FiUser size={12} />
                                {event.user || "System"}
                            </div>
                            <span style={{ color: '#e2e8f0' }}>•</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {new Date(event.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ClinicalTimeline;
