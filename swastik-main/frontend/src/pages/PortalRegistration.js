import React, { useState } from 'react';
import './PortalStyles.css';

const PortalRegistration = ({ standalone = true }) => {
    const [formData, setFormData] = useState({
        patientName: '',
        email: '',
        phone: '',
        password: '',
        dob: '',
        gender: '',
        city: ''
    });
    const [idGenerated, setIdGenerated] = useState('');


    const [, setError] = useState('');
    const [, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { api } = await import('../api/service');
            const response = await api.createPatient({
                name: formData.patientName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                dob: formData.dob,
                gender: formData.gender
            });

            setIdGenerated(response.uhid);
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (idGenerated) {
        return (
            <div className="portal-success-container">
                <span className="portal-success-icon">🎉</span>
                <h3>Registration Successful!</h3>
                <p>Welcome to Swastik Hospital family. Your unique Patient ID is ready.</p>
                <div className="portal-id-card">
                    <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Unique Patient ID
                    </span>
                    <div className="portal-id-value">{idGenerated}</div>
                    <p style={{ margin: '1rem 0 0', fontSize: '0.8rem', color: '#166534' }}>
                        Please save this ID for all future logins.
                    </p>
                </div>
                <button
                    className="portal-auth-btn"
                    onClick={() => window.location.href = '/patient-portal/login'}
                >
                    Continue to Login &rarr;
                </button>
            </div>
        );
    }

    const registrationForm = (
        <form className="portal-form-unified" onSubmit={handleSubmit}>
            <div className="portal-form-grid">
                <div className="portal-form-group full-width">
                    <label>Full Patient Name *</label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={formData.patientName}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    />
                </div>

                <div className="portal-form-group">
                    <label>Email Address *</label>
                    <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>

                <div className="portal-form-group">
                    <label>Phone Number *</label>
                    <input
                        type="tel"
                        required
                        placeholder="+91 XXXXX XXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>

                <div className="portal-form-group">
                    <label>Choose Password *</label>
                    <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        autoComplete="new-password"
                    />
                </div>

                <div className="portal-form-group">
                    <label>Date of Birth</label>
                    <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    />
                </div>

                <div className="portal-form-group">
                    <label>Gender</label>
                    <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

            </div>

            <button type="submit" className="portal-auth-btn">
                Register & Generate ID &rarr;
            </button>
        </form>
    );

    if (standalone) {
        return (
            <div className="portal-auth-layout" style={{ background: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                <div className="portal-auth-card" style={{ background: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
                    <div className="portal-auth-header" style={{ textAlign: 'center' }}>
                        <h2>Create Patient Account</h2>
                        <p>Join Swastik Hospital for better health management.</p>
                    </div>
                    {registrationForm}
                </div>
            </div>
        );
    }

    return registrationForm;
};

export default PortalRegistration;
