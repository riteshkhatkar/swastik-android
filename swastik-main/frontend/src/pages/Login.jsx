import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import swastikLogo from "../assets/swasstiklogo.png";
import orelseLogo from "../assets/orelse.png";
import GoogleSignInModal from "../components/homepage/GoogleSignInModal";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState("English");
  const [error, setError] = useState("");

  const roleValue = searchParams.get("role") || "staff";

  const getRoleDisplayName = (val) => {
    switch (val) {
      case "doctor": return "Doctor";
      case "receptionist": return "Receptionist";
      case "lab": return "Lab Technician";
      case "billing": return "Billing";
      case "admin": return "Admin";
      default: return val ? val.charAt(0).toUpperCase() + val.slice(1) : "Staff";
    }
  };
  const roleName = getRoleDisplayName(roleValue);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { api } = await import("../api/service");
      const response = await api.login(username.trim(), password);

      // Store session info
      const role = response.user.role.toLowerCase();
      localStorage.setItem("swastik_token", response.access_token);
      localStorage.setItem("swastik_user", JSON.stringify(response.user));

      // Store role separately for dashboard logic
      localStorage.setItem("swastik_role", role);

      // Redirect to admin directly, other roles to /dashboard
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      setError(err.message || "Invalid username or password. Please try again.");
    }
  };

  return (
    <div className="swastik-login-page">
      <div className="swastik-login-logo-wrap swastik-login-logo-red">
        <img src={swastikLogo} alt="Swastik Hospital" className="swastik-login-logo" />
      </div>

      <div className="swastik-login-card">
        <header className="swastik-login-card-header">
          <span className="swastik-login-tab active">Login</span>
          <div className="swastik-login-locale">
            <span className="swastik-login-locale-label">Select Locale</span>
            <select
              className="swastik-login-locale-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              aria-label="Select language"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Marathi">Marathi</option>
            </select>
          </div>
        </header>

        <div className="swastik-login-card-body">
          <h1 className="swastik-login-title">SWASTIK HOSPITAL LOGIN</h1>

          <form className="swastik-login-form" onSubmit={handleSubmit}>
            <div className="swastik-login-field">
              <label htmlFor="username">Username *</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>
            <div className="swastik-login-field">
              <label htmlFor="password">Password *</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="swastik-login-error">{error}</p>}
            <button type="submit" className="swastik-login-btn">
              Login
            </button>

            <div className="swastik-login-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="google-login-btn"
              onClick={() => setShowGoogleModal(true)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </form>
        </div>
      </div>

      <footer className="swastik-login-footer">
        <img src={orelseLogo} alt="or else" className="swastik-login-orelse-logo" />
      </footer>

      {showGoogleModal && (
        <GoogleSignInModal
          roleName={roleName}
          roleValue={roleValue}
          onClose={() => setShowGoogleModal(false)}
          onFailure={(errMessage) => {
            setError(errMessage);
          }}
        />
      )}
    </div>
  );
}

export default Login;

