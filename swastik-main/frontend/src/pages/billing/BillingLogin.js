import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { validateStaff, setStaffSession } from "../../utils/staffAuth";
import "./BillingLogin.css";

function BillingLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const user = validateStaff(username.trim(), password);
    if (user && user.role === "billing") {
      setStaffSession(user);
      navigate("/billing", { replace: true });
    } else if (user) {
      setError("Access denied. Billing login only.");
    } else {
      setError("Invalid credentials.");
    }
  };

  return (
    <div className="billing-login-page">
      <div className="billing-login-card">
        <h1 className="billing-login-title">Billing Access</h1>
        <p className="billing-login-subtitle">Swastik Hospital – Authorized billing staff only.</p>
        <form className="billing-login-form" onSubmit={handleSubmit}>
          <div className="billing-login-field">
            <label htmlFor="billing-username">Username</label>
            <input
              id="billing-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              autoComplete="username"
            />
          </div>
          <div className="billing-login-field">
            <label htmlFor="billing-password">Password</label>
            <input
              id="billing-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="billing-login-error">{error}</p>}
          <button type="submit" className="billing-login-btn">Sign in</button>
        </form>
        <p className="billing-login-footer">Session secured. Unauthorized access is prohibited.</p>
      </div>
    </div>
  );
}

export default BillingLogin;
