import React from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiCalendar, FiUsers, FiPlusCircle, FiFileText, FiClipboard, FiFilePlus, FiSettings, FiLogOut, FiActivity, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { FaStethoscope } from "react-icons/fa";

const MENU_ITEMS = [
  { path: "", label: "Dashboard", icon: FiHome },
  { path: "ward-rounds", label: "Ward Rounds", icon: FiActivity, isTabTrigger: true },
  { path: "appointments", label: "Today's Appointments", icon: FiCalendar },
  { path: "patients", label: "Patient List", icon: FiUsers },
  { path: "consultation", label: "New Consultation", icon: FiPlusCircle },
  { path: "lab-orders", label: "Lab Orders", icon: FaStethoscope },
  { path: "prescriptions", label: "Prescriptions", icon: FiFilePlus },
  { path: "reports", label: "Reports", icon: FiFileText },
  { path: "settings", label: "Settings", icon: FiSettings },
];

function DoctorSidebar({ doctorName, onLogout, sidebarOpen, isCollapsed, onToggle, onCloseSidebar }) {
  return (
    <aside className={`doctor-sidebar ${sidebarOpen ? "doctor-sidebar--open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
      <button className="doctor-sidebar-toggle" onClick={onToggle}>
        {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
      </button>

      <div className="doctor-sidebar__brand">
        <div className="doctor-sidebar__logo">
          <FaStethoscope className="doctor-sidebar__logo-icon" />
          <span className="doctor-sidebar__title">Swastik Hospital</span>
        </div>
        <button className="doctor-sidebar-close" onClick={onCloseSidebar}>
          <FiX />
        </button>
      </div>

      <nav className="doctor-sidebar__nav">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path || "dashboard"}
              to={item.path ? `/doctor/${item.path}` : "/doctor"}
              end={!item.path}
              className={({ isActive }) =>
                `doctor-sidebar__link ${isActive ? "doctor-sidebar__link--active" : ""}`
              }
              onClick={onCloseSidebar}
              title={isCollapsed ? item.label : ""}
            >
              <Icon className="doctor-sidebar__link-icon" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="doctor-sidebar__footer">
        <div className="doctor-sidebar__user">
          <div className="doctor-sidebar__avatar">
            {doctorName ? doctorName.charAt(0).toUpperCase() : "D"}
          </div>
          <div className="doctor-sidebar__user-info">
            <span className="doctor-sidebar__user-name">{doctorName}</span>
            <span className="doctor-sidebar__user-role">Doctor</span>
          </div>
        </div>
        <button className="doctor-sidebar__logout" onClick={onLogout}>
          <FiLogOut className="doctor-sidebar__logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default DoctorSidebar;
