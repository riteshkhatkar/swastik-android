import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import DoctorSidebar from "./DoctorSidebar";
import { FiMenu, FiX } from "react-icons/fi";
import { FaStethoscope } from "react-icons/fa";
import BackToHomeButton from "../../components/BackToHomeButton";
import "./doctor.css";

function DoctorLayout() {
  const [doctorName] = useState(() => {
    const userStr = localStorage.getItem("swastik_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.full_name || user.name || "Doctor";
    }
    return "Doctor";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('doctor_sidebar_collapsed') === 'true');

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('doctor_sidebar_collapsed', newState);
      return newState;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("swastik_token");
    localStorage.removeItem("swastik_user");
    localStorage.removeItem("swastik_role");
    window.location.href = "/login";
  };

  return (
    <div className={`doctor-layout ${isCollapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Top Bar */}
      <header className="doctor-mobile-header">
        <div className="doctor-mobile-brand">
          <FaStethoscope className="doctor-mobile-logo-icon" />
          <span>Swastik Hospital</span>
        </div>
        <button className="doctor-mobile-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <FiX /> : <FiMenu />}
        </button>
      </header>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="doctor-sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'block',
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 998
          }}
        ></div>
      )}

      <DoctorSidebar
        doctorName={doctorName}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        isCollapsed={isCollapsed}
        onToggle={() => {
          if (window.innerWidth < 768) {
            setSidebarOpen(!sidebarOpen);
          } else if (window.innerWidth <= 1024) {
            setSidebarOpen(!sidebarOpen);
          } else {
            toggleSidebar();
          }
        }}
        onCloseSidebar={() => setSidebarOpen(false)}
      />
      <div className={`doctor-main ${isCollapsed ? 'collapsed' : ''}`}>
        <main className="doctor-content">
          <BackToHomeButton />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DoctorLayout;
