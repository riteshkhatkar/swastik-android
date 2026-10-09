import React from "react";
import { Outlet, Navigate, useNavigate, NavLink } from "react-router-dom";
import { FiHome, FiCalendar, FiUsers, FiPlusCircle, FiSearch, FiActivity, FiCreditCard, FiBell, FiLogOut, FiChevronLeft, FiChevronRight, FiMenu, FiX } from 'react-icons/fi';
import { FaRegHospital } from "react-icons/fa";
import { getStaffRole } from "../../utils/staffAuth";
import BackToHomeButton from "../../components/BackToHomeButton";
import "./ReceptionistLayout.css";

function ReceptionistLayout() {
  const navigate = useNavigate();
  const role = getStaffRole();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isCollapsed, setIsCollapsed] = React.useState(localStorage.getItem('sidebar_collapsed') === 'true');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar_collapsed', newState);
      return newState;
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  React.useEffect(() => {
    const fetchCount = async () => {
      try {
        const { api } = await import("../../api/service");
        const notifs = await api.getNotifications("receptionist");
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      } catch (e) { console.error(e); }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  if (role !== "receptionist") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_role");
    navigate("/login");
  };

  return (
    <div className={`recep-layout ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Top Bar */}
      <header className="recep-mobile-header">
        <div className="recep-mobile-brand">
          <FaRegHospital className="recep-mobile-logo-icon" />
          <span>Swastik Hospital</span>
        </div>
        <button className="recep-mobile-hamburger" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && <div className="recep-sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <aside className={`recep-sidebar app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
          {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
        <div className="recep-sidebar__brand">
          <div className="recep-sidebar__logo">
            <FaRegHospital className="recep-sidebar__logo-icon" />
            <span className="recep-sidebar__title">Swastik Hospital</span>
          </div>
          <button className="recep-sidebar-close" onClick={() => setIsMobileMenuOpen(false)}>
            <FiX />
          </button>
        </div>

        <nav className="recep-sidebar-nav">
          <NavLink to="/receptionist" end className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}>
            <FiHome className="recep-nav-icon" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/receptionist/appointments" className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}>
            <FiCalendar className="recep-nav-icon" />
            <span>Appointments</span>
          </NavLink>

          <div className="recep-nav-group">
            <span className="recep-nav-group-label micro-label uppercase tracking-widest text-[10px] text-slate-400">Patients</span>
            <NavLink to="/receptionist/patients/register" className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}>
              <FiPlusCircle className="recep-nav-icon" />
              <span>Register New Patient</span>
            </NavLink>
            <NavLink to="/receptionist/patients" end className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}>
              <FiUsers className="recep-nav-icon" />
              <span>Patient List</span>
            </NavLink>
            <NavLink to="/receptionist/patients/search" className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}>
              <FiSearch className="recep-nav-icon" />
              <span>Search UHID</span>
            </NavLink>
          </div>

          <NavLink to="/receptionist/admissions" className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}>
            <FiActivity className="recep-nav-icon" />
            <span>Admissions</span>
          </NavLink>

          <NavLink to="/receptionist/billing" className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}>
            <FiCreditCard className="recep-nav-icon" />
            <span>Billing</span>
          </NavLink>

          <NavLink to="/receptionist/notifications" className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'inherit' }}>
              <FiBell className="recep-nav-icon" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className={`recep-nav-badge ${isCollapsed ? 'collapsed' : ''}`}>
                  {unreadCount}
                </span>
              )}
            </div>
          </NavLink>
        </nav>

        <div className="recep-sidebar__footer">
          <div className="recep-sidebar__user">
            <div className="recep-sidebar__avatar">R</div>
            <div className="recep-sidebar__user-info">
              <span className="recep-sidebar__user-name">Receptionist</span>
              <span className="recep-sidebar__user-role">Front Desk</span>
            </div>
          </div>
          <button className="recep-sidebar__logout" onClick={handleLogout}>
            <FiLogOut className="recep-sidebar__logout-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className={`recep-main ${isCollapsed ? 'collapsed' : ''}`}>
        <BackToHomeButton />
        <Outlet context={{ isMobileMenuOpen }} />
      </main>
    </div>
  );
}

export default ReceptionistLayout;
