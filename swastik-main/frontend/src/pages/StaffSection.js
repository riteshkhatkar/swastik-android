import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getStaffRole, canAccessSection } from "../utils/staffAuth";
import "./StaffSection.css";

const VALID_SECTIONS = ["receptionist", "doctor", "lab", "admin"];
const SECTION_LABELS = {
  receptionist: "Receptionist",
  doctor: "Doctor",
  lab: "Lab",
  admin: "Admin",
};

function StaffSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.replace(/^\//, "").split("/")[0];
  const role = getStaffRole();

  if (!VALID_SECTIONS.includes(section) || !role || !canAccessSection(role, section)) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const label = SECTION_LABELS[section] || section;

  return (
    <div className="staff-section-page">
      <header className="staff-section-header">
        <button type="button" className="staff-section-back" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
        <h1>{label} Section</h1>
        <span className="staff-section-role">{role}</span>
      </header>
      <main className="staff-section-main">
        <p className="staff-section-welcome">Welcome to the {label} section. Content for this area can be added here.</p>
      </main>
    </div>
  );
}

export default StaffSection;
