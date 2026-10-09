import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PortalStyles.css';

const PortalDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const [appointments, setAppointments] = useState([]);
    const [records, setRecords] = useState([]);
    const [bills, setBills] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

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
                const [appointmentData, historyData, billingData, notificationData] = await Promise.all([
                    api.getAppointments(uhid),
                    api.getClinicalHistory(uhid),
                    api.getBillsByPatient(uhid),
                    api.getNotifications(`patient:${uhid}`)
                ]);
                setAppointments(appointmentData || []);
                setRecords(historyData || []);
                setBills(billingData || []);
                setNotifications(notificationData?.filter(n => !n.is_read) || []);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    if (!user || loading) return <div className="portal-sub-page"><p>Loading dashboard...</p></div>;

    return (
        <div className="portal-sub-page">
            {notifications.length > 0 && (
                <div className="portal-notifications-alert">
                    <div className="alert-header">
                        <span className="icon">⚠️</span>
                        <h4>Important Updates</h4>
                    </div>
                    <ul className="alert-list">
                        {notifications.map((n, i) => (
                            <li key={i}>{n.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="portal-header">
                <h2>Welcome back, {user.full_name || user.patientName || user.name}</h2>
                <p>Track your health journey and manage appointments securely.</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#0d9488', fontWeight: 600 }}>
                    Patient ID: {user.username || user.uhid || user.patientId}
                </div>
            </div>

            <div className="portal-stats-grid">
                <div className="portal-stat-card" onClick={() => navigate('/patient-portal/records')}>
                    <span className="icon">🏥</span>
                    <h3>{records.length}</h3>
                    <p>Visits Recorded</p>
                </div>
                <div className="portal-stat-card" onClick={() => navigate('/patient-portal/records', { state: { activeTab: 'billing' } })}>
                    <span className="icon">💳</span>
                    <h3>{bills.filter(b => (b.status || '').toLowerCase() === 'unpaid' || (b.status || '').toLowerCase() === 'pending').length}</h3>
                    <p>Pending Bills</p>
                </div>
                <div className="portal-stat-card" style={{ background: '#f0fdf4', borderColor: '#99f6e4' }} onClick={() => navigate('/patient-portal/appointments')}>
                    <span className="icon">📅</span>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>Book Now</h3>
                    <p>New Appointment</p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '2rem' }}>
                <h3 className="portal-section-title" style={{ margin: 0 }}>
                    💳 Recent Billing Activity
                </h3>
            </div>

            <div className="portal-table-container">
                <table className="portal-data-table">
                    <thead>
                        <tr>
                            <th>Bill ID</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bills.slice(0, 5).map((bill, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 700, color: '#0d9488' }}>{bill.invoice_number || bill.bill_id || 'N/A'}</td>
                                <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                                <td>₹{bill.total || bill.amount}</td>
                                <td>
                                    <span className={`status-badge status-badge--${(bill.status || 'unpaid').toLowerCase()}`}>
                                        {bill.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {bills.length === 0 && (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No billing history available.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '3rem' }}>
                <h3 className="portal-section-title" style={{ margin: 0 }}>
                    📄 Recent Medical Records
                </h3>
                <button
                    onClick={() => navigate('/patient-portal/records')}
                    style={{
                        border: 'none',
                        background: 'none',
                        color: '#0d9488',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                    }}
                >
                    View All History &rarr;
                </button>
            </div>

            <div className="portal-table-container">
                <table className="portal-data-table">
                    <thead>
                        <tr>
                            <th>Visit Date</th>
                            <th>Consultation Type</th>
                            <th>Summary / Notes</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.slice(0, 5).map((record, i) => (
                            <tr key={i}>
                                <td>{new Date(record.created_at).toLocaleDateString()}</td>
                                <td>{record.type}</td>
                                <td>{record.data?.shortTermGoals || record.data?.soap?.p || 'Visit recorded'}</td>
                                <td><span className="status-badge status-badge--completed">Completed</span></td>
                            </tr>
                        ))}
                        {records.length === 0 && (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No medical records available yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '3rem' }}>
                <h3 className="portal-section-title">📅 Upcoming Appointments</h3>
                {appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'needs_reschedule').length > 0 ? (
                    <div className="portal-table-container">
                        <table className="portal-data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Doctor</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'needs_reschedule').map((app, i) => (
                                    <tr key={i}>
                                        <td>{app.appointment_date}</td>
                                        <td>{app.appointment_time}</td>
                                        <td>{app.doctor_name || 'Doctor'}</td>
                                        <td><span className={`status-badge status-badge--${app.status}`}>{app.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: '20px',
                        border: '2px dashed #e2e8f0',
                        color: '#64748b'
                    }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🗓️</span>
                        <p style={{ fontSize: '1.1rem', fontWeight: 500, margin: 0 }}>No upcoming appointments scheduled.</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Please book an appointment to consult with our experts.</p>
                        <button
                            className="portal-auth-btn"
                            style={{ width: 'auto', padding: '0.75rem 2rem', marginTop: '1.5rem' }}
                            onClick={() => navigate('/patient-portal/appointments')}
                        >
                            Schedule Appointment
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortalDashboard;
