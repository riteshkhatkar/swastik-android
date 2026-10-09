import React from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { FiHome, FiActivity, FiLogOut, FiSettings, FiChevronLeft, FiChevronRight, FiMenu, FiX } from "react-icons/fi";
import { FaFlask } from "react-icons/fa";
import BackToHomeButton from "../../components/BackToHomeButton";
import "./Lab.css";

function LabLayout() {
  const navigate = useNavigate();
  const labUserName = localStorage.getItem("swastik_lab_user") || "Lab Assistant";
  const [isCollapsed, setIsCollapsed] = React.useState(localStorage.getItem('lab_sidebar_collapsed') === 'true');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('lab_sidebar_collapsed', newState);
      return newState;
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem("swastik_token");
    navigate("/login");
  };

  return (
    <div className={`lab-layout ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Top Bar */}
      <header className="lab-mobile-header">
        <div className="lab-mobile-brand">
          <FaFlask className="lab-mobile-logo-icon" />
          <span>Swastik Hospital</span>
        </div>
        <button className="lab-mobile-hamburger" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && <div className="lab-sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <aside className={`lab-sidebar app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <button className="lab-sidebar-toggle" onClick={toggleSidebar}>
          {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
        <div className="lab-sidebar__brand">
          <div className="lab-sidebar__logo-container">
            <FaFlask className="lab-sidebar__logo-icon" />
            <span className="lab-sidebar__title">Lab Dept</span>
          </div>
          <button className="lab-sidebar-close" onClick={() => setIsMobileMenuOpen(false)}>
            <FiX />
          </button>
        </div>

        <nav className="lab-sidebar__nav">
          <NavLink
            to="/lab"
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? "nav-item-active" : ""}`
            }
          >
            <FiHome className="lab-sidebar__icon" />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink
            to="/lab/tests"
            className={({ isActive }) =>
              `nav-item ${isActive ? "nav-item-active" : ""}`
            }
          >
            <FiActivity className="lab-sidebar__icon" />
            <span>Tests & Samples</span>
          </NavLink>

          <NavLink
            to="/lab/settings"
            className={({ isActive }) =>
              `nav-item ${isActive ? "nav-item-active" : ""}`
            }
          >
            <FiSettings className="lab-sidebar__icon" />
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="lab-sidebar__footer">
          <div className="lab-sidebar__user">
            <div className="lab-sidebar__avatar">
              {labUserName.charAt(0).toUpperCase()}
            </div>
            <div className="lab-sidebar__user-info">
              <span className="lab-sidebar__user-name">{labUserName}</span>
              <span className="lab-sidebar__user-role">Laboratory</span>
            </div>
          </div>
          <button className="lab-sidebar__logout" onClick={handleLogout}>
            <FiLogOut className="lab-sidebar__logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className={`lab-main ${isCollapsed ? 'collapsed' : ''}`}>
        <BackToHomeButton />
        <Outlet />
      </main>
    </div>
  );
}

export default LabLayout;
