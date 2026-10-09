import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStaffRole, isStaffSessionValid, canAccessSection } from "../../utils/staffAuth";
import BillingLogin from "./BillingLogin";
import BillingDashboard from "./BillingDashboard";

/**
 * STRICT Billing Route Gate
 * 1. Checks if session is valid.
 * 2. Checks if role is authorized for billing.
 * 3. Handles redirection appropriately.
 */
function BillingGate() {
  const location = useLocation();
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("swastik_token") : null;
  const role = getStaffRole();
  const sessionValid = isStaffSessionValid();

  if (!token || !sessionValid) {
    if (token) localStorage.removeItem("swastik_token");
    return <BillingLogin />;
  }

  // Strict role check for billing module
  if (!canAccessSection(role, "billing")) {
    // If they came here from elsewhere and are logged in but not authorized, send them to dashboard
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  // Fully authorized
  return <BillingDashboard />;
}

export default BillingGate;
