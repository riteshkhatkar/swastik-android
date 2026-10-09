import React, { useState, useEffect } from "react";
import { FiBox, FiCheckCircle, FiActivity, FiMapPin, FiUser, FiInfo } from 'react-icons/fi';
import "./ReceptionistDashboard.css";

const WARD_COLORS = {
    "General": "#f0fdf4",
    "Private": "#eff6ff",
    "ICU": "#fff1f2"
};

const WARD_TEXT = {
    "General": "#16a34a",
    "Private": "#2563eb",
    "ICU": "#e11d48"
};

export default function RoomManagement() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const { api } = await import("../../api/service");
            const data = await api.getRooms();
            setRooms(data || []);
        } catch (err) {
            console.error("Error fetching rooms:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const filteredRooms = filter === "All" ? rooms : rooms.filter(r => r.room_type === filter);
    const occupiedCount = rooms.filter(r => r.status === "Occupied").length;
    const availableCount = rooms.filter(r => r.status === "Available").length;

    return (
        <div className="recep-dash">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="recep-dash-title">Live Room Management</h1>
                    <p className="recep-dash-subtitle">Real-time bed occupancy and ward status across Swastik Hospital.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="recep-dash-card" style={{ padding: '0.75rem 1.5rem', minWidth: 'auto', borderLeft: '4px solid #16a34a' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>AVAILABLE</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>{availableCount}</span>
                    </div>
                    <div className="recep-dash-card" style={{ padding: '0.75rem 1.5rem', minWidth: 'auto', borderLeft: '4px solid #e11d48' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>OCCUPIED</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#e11d48' }}>{occupiedCount}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {["All", "General", "Private", "ICU"].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`recep-btn ${filter === f ? 'recep-btn-primary' : 'recep-btn-secondary'}`}
                        style={{ borderRadius: '12px', padding: '0.8rem 1.5rem' }}
                    >
                        {f} Wards
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <FiActivity className="spin" style={{ fontSize: '3rem', color: '#0d9488' }} />
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Polling Bed Status...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {filteredRooms.map(room => (
                        <div
                            key={room._id}
                            className="recep-dash-card"
                            style={{
                                position: 'relative',
                                border: '1px solid #e2e8f0',
                                background: room.status === "Occupied" ? '#fff' : WARD_COLORS[room.room_type] || '#fff',
                                opacity: room.status === "Maintenance" ? 0.6 : 1
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>Room {room.room_number}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: WARD_TEXT[room.room_type] || '#64748b' }}>
                                        {room.room_type.toUpperCase()} WARD
                                    </div>
                                </div>
                                <span className={`recep-status ${room.status === "Available" ? "recep-status-confirmed" : "recep-status-pending"}`} style={{ fontSize: '0.7rem' }}>
                                    {room.status}
                                </span>
                            </div>

                            {room.status === "Occupied" ? (
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <FiUser style={{ color: '#0d9488' }} />
                                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{room.current_patient_name || "Admitted Patient"}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '1.5rem' }}>
                                        UHID: {room.current_patient_uhid || "PAT-XXXXX"}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                                    <FiCheckCircle style={{ marginBottom: '0.5rem', color: '#16a34a' }} /><br />
                                    Ready for Admission
                                </div>
                            )}

                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <FiInfo /> ₹{room.price_per_day}/day
                                </div>
                                {room.status === "Available" && (
                                    <button className="recep-btn" style={{ background: 'white', border: '1px solid #0d9488', color: '#0d9488', fontSize: '0.75rem' }}>
                                        Assign Bed
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
