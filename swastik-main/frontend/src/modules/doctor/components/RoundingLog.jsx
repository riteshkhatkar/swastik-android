import React from "react";
import { FiClock, FiCheckCircle, FiEdit3 } from "react-icons/fi";

function RoundingLog({ notes = [] }) {
    if (!notes || notes.length === 0) {
        return (
            <div className="doctor-card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <FiEdit3 size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No rounding notes recorded for this admission.</p>
            </div>
        );
    }

    return (
        <div className="rounding-timeline" style={{ paddingLeft: '1.5rem', borderLeft: '2px solid #e2e8f0', position: 'relative' }}>
            {notes.map((note, idx) => (
                <div key={note.id || idx} className="rounding-item" style={{ marginBottom: '2.5rem', position: 'relative' }}>
                    {/* Timeline Dot */}
                    <div style={{
                        position: 'absolute',
                        left: '-31px',
                        top: '0',
                        background: 'white',
                        padding: '4px',
                        borderRadius: '50%',
                        border: '2px solid #3b82f6',
                        color: '#3b82f6',
                        zIndex: 2
                    }}>
                        <FiCheckCircle size={14} />
                    </div>

                    <div className="doctor-card" style={{ padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiClock size={16} color="#64748b" />
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                    {new Date(note.session_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                                {note.signed_by || note.role_tag}
                            </span>
                        </div>

                        <div className="rounding-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                            <div className="rounding-block">
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Subjective</label>
                                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>{note.subjective || "No complaints."}</div>
                            </div>
                            <div className="rounding-block">
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Objective</label>
                                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>{note.objective || "Vitals stable."}</div>
                            </div>
                            <div className="rounding-block" style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Assessment</label>
                                <div style={{ fontSize: '0.85rem', color: '#475569', fontStyle: 'italic', marginBottom: '8px' }}>{note.assessment || "Clinical status maintained."}</div>

                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>Plan & Intervention</label>
                                <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.4, background: '#f8fafc', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                                    {note.plan || "Continue treatment."}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default RoundingLog;
