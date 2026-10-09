import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PortalStyles.css';

const PortalLogin = ({ standalone = true }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const queryParams = new URLSearchParams(location.search);
    const redirectPath = queryParams.get('redirect') || '/patient-portal/dashboard';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const { api } = await import('../api/service');
            const response = await api.login(loginId, password);

            // Store token and user info
            localStorage.setItem('swastik_token', response.access_token);
            localStorage.setItem('portal_user', JSON.stringify(response.user));

            navigate(redirectPath);
        } catch (err) {
            setError(err.message || 'Invalid Patient ID or Password. Please try again or Register.');
        }
    };

    const loginForm = (
        <form className="portal-form-unified" onSubmit={handleLogin}>
            <div className="portal-form-group full-width">
                <label>Patient ID or Registered Email</label>
                <input
                    type="text"
                    required
                    placeholder="e.g. SWA-2026-XXXX or email@example.com"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                />
            </div>

            <div className="portal-form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Password</label>
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                    >
                        {showPassword ? 'Hide' : 'Show'}
                    </button>
                </div>
                <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                />
            </div>

            {error && (
                <div style={{
                    color: '#dc2626',
                    background: '#fef2f2',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    border: '1.5px solid #fee2e2'
                }}>
                    {error}
                </div>
            )}

            <button type="submit" className="portal-auth-btn">
                Secure Login &rarr;
            </button>
        </form>
    );

    if (standalone) {
        return (
            <div className="portal-auth-layout" style={{ background: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
                <div className="portal-auth-card" style={{ background: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
                    <div className="portal-auth-header" style={{ textAlign: 'center' }}>
                        <h2>Portal Login</h2>
                        <p>Access your health records securely.</p>
                    </div>
                    {loginForm}
                </div>
            </div>
        );
    }

    return loginForm;
};

export default PortalLogin;
