import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PortalLogin from './PortalLogin';
import PortalRegistration from './PortalRegistration';
import { SimpleFooter } from '../components/homepage';
import './PortalStyles.css';
import portalBg from '../assets/portal_bg.png';
import logo from '../assets/swasstiklogo.png';

const PortalAuth = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Sync active tab with location path
    const [activeTab, setActiveTab] = useState('login');

    React.useEffect(() => {
        if (location.pathname.includes('register')) {
            setActiveTab('register');
        } else {
            setActiveTab('login');
        }
    }, [location.pathname]);

    return (
        <div className="portal-auth-layout">
            <div className="portal-auth-wrapper">
                {/* Left Side: Branding & Trust */}
                <div className="portal-auth-visual" style={{ backgroundImage: `url(${portalBg})` }}>
                    <div className="portal-auth-visual-content">
                        <img src={logo} alt="Swastik Logo" style={{ height: '60px', marginBottom: '2rem' }} />
                        <h1>Better Health Starts Here.</h1>
                        <p>
                            Welcome to your secure Patient Portal. Join thousands of patients
                            who manage their healthcare journey with ease and confidentiality.
                        </p>
                    </div>
                </div>

                {/* Right Side: Form Container */}
                <div className="portal-auth-form-side">
                    <div className="portal-auth-card">
                        <div className="portal-auth-header">
                            <h2>{activeTab === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                            <p>
                                {activeTab === 'login'
                                    ? 'Sign in to access your clinical records and appointments.'
                                    : 'Join Swastik Hospital family for personalized digital care.'}
                            </p>
                        </div>

                        <div className="portal-auth-tabs">
                            <button
                                className={`portal-auth-tab ${activeTab === 'login' ? 'portal-auth-tab--active' : ''}`}
                                onClick={() => navigate('/patient-portal/login')}
                            >
                                Sign In
                            </button>
                            <button
                                className={`portal-auth-tab ${activeTab === 'register' ? 'portal-auth-tab--active' : ''}`}
                                onClick={() => navigate('/patient-portal/register')}
                            >
                                Get Started
                            </button>
                        </div>

                        <div className="portal-auth-form-body">
                            {activeTab === 'login' ? (
                                <PortalLogin standalone={false} />
                            ) : (
                                <PortalRegistration standalone={false} />
                            )}
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}
                            >
                                &larr; Back to Hospital Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <SimpleFooter />
        </div>
    );
};

export default PortalAuth;
