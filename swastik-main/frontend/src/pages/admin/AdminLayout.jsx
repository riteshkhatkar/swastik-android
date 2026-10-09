import React from "react";
import { Outlet, useNavigate, NavLink, Navigate } from "react-router-dom";
import { FiHome, FiUsers, FiLayers, FiPieChart, FiActivity, FiSettings, FiShield, FiCpu, FiBarChart2, FiLogOut, FiChevronLeft, FiChevronRight, FiMenu, FiX } from "react-icons/fi";
import { getStaffRole, clearStaffSession } from "../../utils/staffAuth";
import BackToHomeButton from "../../components/BackToHomeButton";
import "./AdminLayout.css";

const NAV = [
  { path: "/admin", label: "Hospital Overview", icon: FiHome, end: true },
  { path: "/admin/users", label: "User Management", icon: FiUsers, end: false },
  { path: "/admin/departments", label: "Departments", icon: FiLayers, end: false },
  { path: "/admin/financial", label: "Financials", icon: FiPieChart, end: false },
  { path: "/admin/lab-clinical", label: "Lab Monitoring", icon: FiActivity, end: false },
  { path: "/admin/config", label: "Configuration", icon: FiSettings, end: false },
  { path: "/admin/audit", label: "Audit Logs", icon: FiShield, end: false },
  { path: "/admin/health", label: "System Health", icon: FiCpu, end: false },
  { path: "/admin/reports", label: "Reports", icon: FiBarChart2, end: false },
];

function AdminLayout() {
  const navigate = useNavigate();
  const role = getStaffRole();
  const [isCollapsed, setIsCollapsed] = React.useState(localStorage.getItem('admin_sidebar_collapsed') === 'true');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('admin_sidebar_collapsed', newState);
      return newState;
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const handleLogout = () => {
    clearStaffSession(); 
    navigate("/login");
  };

  return (
    <div className={`admin-layout ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Top Bar */}
      <header className="admin-mobile-header">
        <div className="admin-mobile-brand">
          <FiShield className="admin-mobile-logo-icon" />
          <span>Swastik Hospital</span>
        </div>
        <button className="admin-mobile-hamburger" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && <div className="admin-sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <aside className={`admin-sidebar app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <button className="admin-sidebar-toggle" onClick={toggleSidebar}>
          {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo">
            <FiShield className="admin-sidebar__logo-icon" />
            <span className="admin-sidebar__title">Admin Center</span>
          </div>
          <button className="admin-sidebar-close" onClick={() => setIsMobileMenuOpen(false)}>
            <FiX />
          </button>
        </div>
        
        <nav className="admin-sidebar__nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "nav-item-active" : ""}`
                }
              >
                <Icon className="admin-nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">A</div>
            <div className="admin-sidebar__user-info">
              <span className="admin-sidebar__user-name">System Admin</span>
              <span className="admin-sidebar__user-role">Administrator</span>
            </div>
          </div>
          <button className="admin-sidebar__logout" onClick={handleLogout}>
            <FiLogOut className="admin-sidebar__logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      
      <div className={`admin-main ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="admin-content">
          <BackToHomeButton />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
