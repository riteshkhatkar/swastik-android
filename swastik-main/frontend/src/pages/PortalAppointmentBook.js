import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PortalStyles.css';
import drPm from "../assets/dr_pm.png";
import drNikhil from "../assets/dr_nikhil.png";

const PortalAppointmentBook = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [step, setStep] = useState(1);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [formData, setFormData] = useState({
        type: 'CONSULTATION - 15 MIN',
        date: '',
        time: '',
        reason: ''
    });
    const [doctors, setDoctors] = useState([]);
    const [toast, setToast] = useState('');

    const [bookedSlots, setBookedSlots] = useState([]);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const { api } = await import('../api/service');
                const data = await api.getDoctors();
                
                // Filter unique doctors by name to avoid duplicates like "Dr. Name" and "Name"
                const uniqueData = [];
                const seenNames = new Set();
                
                // Sort to prefer names starting with "Dr." if duplicates exist
                const sorted = [...data].sort((a, b) => {
                    const aDr = a.name.toLowerCase().startsWith('dr.');
                    const bDr = b.name.toLowerCase().startsWith('dr.');
                    if (aDr && !bDr) return -1;
                    if (!aDr && bDr) return 1;
                    return 0;
                });

                sorted.forEach(d => {
                    const normalized = d.name.replace(/^Dr\.\s+/i, '').replace(/[.\s]/g, '').toLowerCase();
                    if (!seenNames.has(normalized)) {
                        seenNames.add(normalized);
                        uniqueData.push(d);
                    }
                });

                setDoctors(uniqueData.map(d => ({
                    id: d._id,
                    name: d.name,
                    specialty: d.specialization || d.department,
                    credentials: d.qualification,
                    photo: d.name.includes('P. M.') ? drPm : drNikhil,
                    experience: "Senior Expert",
                    location: "Swastik Hospital, Kolhapur"
                })));
            } catch (err) {
                console.error('Error fetching doctors:', err);
            }
        };
        fetchDoctors();
    }, []);

    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (selectedDoctor && formData.date) {
                try {
                    const { api } = await import('../api/service');
                    const slots = await api.getBookedSlots(selectedDoctor.id, formData.date);
                    setBookedSlots(slots || []);
                } catch (err) {
                    console.error('Error fetching booked slots:', err);
                }
            }
        };
        fetchBookedSlots();
    }, [selectedDoctor, formData.date]);

    useEffect(() => {
        const savedUser = JSON.parse(localStorage.getItem('portal_user'));
        if (!savedUser) {
            const currentPath = location.pathname + location.search;
            navigate(`/patient-portal/login?redirect=${encodeURIComponent(currentPath)}`);
        } else {
            setUser(savedUser);
            const queryParams = new URLSearchParams(location.search);
            const docId = queryParams.get('docId');
            if (docId && doctors.length > 0) {
                const doc = doctors.find(d =>
                    d.id === docId ||
                    d.id === parseInt(docId).toString() ||
                    (docId === "1" && d.name.includes("P. M.")) ||
                    (docId === "2" && d.name.includes("Nikhil"))
                );
                if (doc) {
                    setSelectedDoctor(doc);
                    setStep(2);
                }
            }
        }
    }, [navigate, location, doctors]);

    const handleSelectDoctor = (doc) => {
        setSelectedDoctor(doc);
        setStep(2);
    };

    const handleBook = async (e) => {
        e.preventDefault();

        try {
            const { api } = await import('../api/service');
            await api.createAppointment({
                uhid: user.username || user.uhid || user.patientId,
                patient_name: user.full_name || user.patientName || user.name,
                patient_phone: user.phone || null,
                doctor_id: selectedDoctor.id,
                appointment_date: formData.date,
                appointment_time: formData.time,
                type: formData.type,
                notes: formData.reason
            });

            setToast(`Booking Confirmed! Appointment with ${selectedDoctor.name} on ${formData.date} at ${formData.time}.`);
            setTimeout(() => {
                setToast('');
                navigate('/patient-portal/dashboard');
            }, 3000);
        } catch (err) {
            console.error('Booking failed:', err);
        }
    };

    const renderCalendar = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="portal-calendar-box">
                <div className="calendar-header">
                    <span>February 2026</span>
                    <div style={{ fontSize: '0.8rem', cursor: 'pointer', color: '#0d9488', fontWeight: 600 }}>
                        Next Month &rarr;
                    </div>
                </div>
                <div className="calendar-grid">
                    {days.map(d => <div key={d} className="calendar-day-label">{d}</div>)}
                    {[...Array(31)].map((_, i) => (
                        <div key={i} className={`calendar-day ${i + 1 === 27 ? 'active' : ''}`}>
                            {i + 1}
                        </div>
                    ))}
                </div>
                <div className="calendar-legend">
                    <div className="legend-item"><span className="legend-dot" style={{ background: '#0d9488' }}></span> Selected</div>
                    <div className="legend-item"><span className="legend-dot" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}></span> Available</div>
                </div>
            </div>
        );
    };

    if (!user) return null;

    return (
        <div className="portal-sub-page">
            <div className="portal-header">
                <h2>{step === 1 ? 'Select Your Specialist' : `Booking Appointment`}</h2>
                <p>{step === 1 ? 'Choose from our team of expert doctors for your consultation.' : `You are booking a session with ${selectedDoctor.name}.`}</p>
            </div>

            {step === 1 ? (
                <div className="portal-doctors-selection">
                    {doctors.map(doc => (
                        <div key={doc.id} className="portal-doctor-card-alt">
                            <img src={doc.photo} alt={doc.name} className="portal-doctor-avatar-small" />
                            <div className="portal-doctor-info-alt">
                                <h3>{doc.name}</h3>
                                <p style={{ color: '#0d9488', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>{doc.specialty}</p>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{doc.credentials}</p>
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                                    <span>🏅 {doc.experience}</span>
                                    <span>📍 Kolhapur</span>
                                </div>
                                <button
                                    className="portal-auth-btn"
                                    style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: '1rem', fontSize: '0.85rem' }}
                                    onClick={() => handleSelectDoctor(doc)}
                                >
                                    Select & Book
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2.5rem' }}>
                    <form className="portal-form-unified" onSubmit={handleBook}>
                        <div className="portal-form-group full-width">
                            <label>Appointment Type</label>
                            <select
                                required
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="CONSULTATION - 15 MIN">Consultation - 15 Min</option>
                                <option value="THERAPY SESSION - 45 MIN">Therapy Session - 45 Min</option>
                                <option value="EMERGENCY CONSULTATION">Emergency Consultation</option>
                            </select>
                        </div>

                        <div className="portal-form-grid">
                            <div className="portal-form-group">
                                <label>Preferred Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div className="portal-form-group">
                                <label>Preferred Time Slot</label>
                                <select
                                    required
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                >
                                    <option value="">Select Time</option>
                                    {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'].map(slot => (
                                        <option
                                            key={slot}
                                            value={slot}
                                            disabled={bookedSlots.includes(slot)}
                                            style={bookedSlots.includes(slot) ? { color: '#cbd5e1', textDecoration: 'line-through' } : {}}
                                        >
                                            {slot} {bookedSlots.includes(slot) ? '(Booked)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="portal-form-group full-width">
                            <label>Reason for Visit (Optional)</label>
                            <textarea
                                placeholder="Briefly describe your concerns..."
                                style={{ minHeight: '100px', padding: '1rem' }}
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" className="btn-portal" style={{ flex: 1, background: '#f1f5f9', color: '#475569', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer' }} onClick={() => setStep(1)}>
                                Back
                            </button>
                            <button type="submit" className="portal-auth-btn" style={{ flex: 2, marginTop: 0 }}>
                                Confirm Appointment
                            </button>
                        </div>
                    </form>

                    <div>
                        <h4 style={{ marginBottom: '1rem', color: '#0f172a' }}>Availability Status</h4>
                        {renderCalendar()}
                        <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                            <p style={{ fontSize: '0.85rem', color: '#0369a1', lineHeight: '1.5', margin: 0 }}>
                                <strong>Note:</strong> Final confirmation will be sent via SMS to your registered mobile number: <strong>{user.phone}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="portal-toast" style={{ background: '#0d9488' }}>
                    <span>✅</span>
                    <span>{toast}</span>
                </div>
            )}
        </div>
    );
};

export default PortalAppointmentBook;
