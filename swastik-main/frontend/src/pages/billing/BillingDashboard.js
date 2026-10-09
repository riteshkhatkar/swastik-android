import React from "react";
import { useNavigate } from "react-router-dom";
import { getStaffRole, clearStaffSession } from "../../utils/staffAuth";
import BillingLayout from "./BillingLayout";
import "./BillingDashboard.css";

function BillingDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("swastik_username") || getStaffRole() || "Billing";

  const handleLogout = () => {
    clearStaffSession();
    navigate("/login");
  };

  return (
    <div className="billing-dash">
      <BillingLayout userName={userName} onLogout={handleLogout} />
    </div>
  );
}

export default BillingDashboard;
