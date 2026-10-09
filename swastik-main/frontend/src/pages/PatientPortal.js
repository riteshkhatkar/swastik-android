import React from 'react';
import { useNavigate, Outlet, useLocation, Navigate, NavLink } from 'react-router-dom';
import { FiHome, FiCalendar, FiFileText, FiActivity, FiLogOut, FiArrowLeft } from 'react-icons/fi';
import { FaUserInjured } from 'react-icons/fa';
import PortalAuth from './PortalAuth';
import { SimpleFooter } from '../components/homepage';
import './PatientPortal.css';

const PatientPortal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const userStr = localStorage.getItem('portal_user');
    const isLoggedIn = !!userStr;
    const user = userStr ? JSON.parse(userStr) : null;

    // If it's the base path /patient-portal, or /patient-portal/login/register, show Auth
    const isAuthPath = location.pathname === '/patient-portal' ||
        location.pathname === '/patient-portal/' ||
        location.pathname.includes('/login') ||
        location.pathname.includes('/register');

    const handleLogout = () => {
        localStorage.removeItem('portal_user');
        navigate('/patient-portal');
    };

    // If not logged in and trying to access dashboard/appointments, etc., redirect to login
    if (!isLoggedIn && !isAuthPath) {
        return <Navigate to="/patient-portal" replace />;
    }

    // If not logged in and on auth path, show the new modern PortalAuth
    if (!isLoggedIn && isAuthPath) {
        return <PortalAuth />;
    }

    return (
        <div className="patient-portal-page">
            <aside className="portal-sidebar">
                <div className="portal-sidebar__brand">
                    <div className="portal-sidebar__logo-container">
                        <FaUserInjured className="portal-sidebar__logo-icon" />
                        <span className="portal-sidebar__title">Swastik Portal</span>
                    </div>
                </div>

                <nav className="portal-sidebar__nav">
                    <button onClick={() => navigate('/')} className="portal-sidebar__item portal-sidebar__back-btn">
                        <FiArrowLeft className="portal-nav-icon" />
                        <span>Hospital Home</span>
                    </button>
                    
                    <div className="portal-sidebar__separator"></div>

                    <NavLink to="/patient-portal/dashboard" className={({ isActive }) => `portal-sidebar__item ${location.pathname.endsWith('dashboard') || isActive ? 'portal-sidebar__item--active' : ''}`}>
                        <FiHome className="portal-nav-icon" />
                        <span>Dashboard</span>
                    </NavLink>
                    
                    <NavLink to="/patient-portal/appointments" className={({ isActive }) => `portal-sidebar__item ${location.pathname.includes('appointments') || isActive ? 'portal-sidebar__item--active' : ''}`}>
                        <FiCalendar className="portal-nav-icon" />
                        <span>Appointments</span>
                    </NavLink>
                    
                    <NavLink to="/patient-portal/records" className={({ isActive }) => `portal-sidebar__item ${location.pathname.includes('records') || isActive ? 'portal-sidebar__item--active' : ''}`}>
                        <FiFileText className="portal-nav-icon" />
                        <span>Records</span>
                    </NavLink>
                    
                    <NavLink to="/patient-portal/lab-tests" className={({ isActive }) => `portal-sidebar__item ${location.pathname.includes('lab-tests') || isActive ? 'portal-sidebar__item--active' : ''}`}>
                        <FiActivity className="portal-nav-icon" />
                        <span>My Lab Tests</span>
                    </NavLink>
                </nav>

                <div className="portal-sidebar__footer">
                    <div className="portal-sidebar__user">
                        <div className="portal-sidebar__avatar">
                            {user?.first_name ? user.first_name.charAt(0) : 'P'}
                        </div>
                        <div className="portal-sidebar__user-info">
                            <span className="portal-sidebar__user-name">{user?.first_name || 'Patient'} {user?.last_name || ''}</span>
                            <span className="portal-sidebar__user-role">Patient</span>
                        </div>
                    </div>
                    <button className="portal-sidebar__logout" onClick={handleLogout}>
                        <FiLogOut className="portal-sidebar__logout-icon" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <div className="patient-portal-layout">
                <main className="patient-portal-content">
                    <Outlet />
                </main>
            </div>
            {/* Simple footer is handled inside content or removed from sidebar layout entirely if full height, but we can keep it inside the main layout flex column */}
        </div>
    );
};

export default PatientPortal;
