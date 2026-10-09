import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStaffRole } from "../utils/staffAuth";
import "./StaffSection.css";

const BILLING_ALLOWED_ROLES = ["doctor", "receptionist"];

function Billing() {
  const navigate = useNavigate();
  const role = getStaffRole();

  useEffect(() => {
    if (!role || !BILLING_ALLOWED_ROLES.includes(role)) {
      navigate("/dashboard", { replace: true });
    }
  }, [role, navigate]);

  if (!role || !BILLING_ALLOWED_ROLES.includes(role)) {
    return null;
  }

  return (
    <div className="staff-section-page">
      <header className="staff-section-header">
        <button type="button" className="staff-section-back" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
        <h1>Billing Section</h1>
        <span className="staff-section-role">{role}</span>
      </header>
      <main className="staff-section-main">
        <p className="staff-section-welcome">Welcome to the Billing section. Bills and payments content can be added here.</p>
      </main>
    </div>
  );
}

export default Billing;
