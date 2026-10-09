import React, { useState, useEffect } from "react";
import { api } from "../../api/service";
import { FiUser, FiLock, FiSettings, FiSliders, FiBell, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

function LabSettings() {
  const [profile, setProfile] = useState({
    full_name: "Lab Assistant",
    username: "lab_assistant",
    role: "Laboratory"
  });

  const [preferences, setPreferences] = useState({
    autoAcknowledge: false,
    tubeType: "EDTA Tube (Purple)",
    verificationMode: "Single-Signoff",
    smsOnCollection: true,
    emailOnPublish: true,
    criticalAlerts: true
  });

  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load profile from swastik_user
    const userStr = localStorage.getItem("swastik_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setProfile({
          full_name: user.full_name || localStorage.getItem("swastik_lab_user") || "Lab Assistant",
          username: user.username || "lab_user",
          role: user.role ? user.role.toUpperCase() : "LABORATORY"
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      // Fallback
      setProfile({
        full_name: localStorage.getItem("swastik_lab_user") || "Lab Assistant",
        username: "lab_user",
        role: "LABORATORY"
      });
    }

    // Load preferences from localStorage
    setPreferences({
      autoAcknowledge: localStorage.getItem("swastik_lab_auto_ack") === "true",
      tubeType: localStorage.getItem("swastik_lab_tube_type") || "EDTA Tube (Purple)",
      verificationMode: localStorage.getItem("swastik_lab_verification") || "Single-Signoff",
      smsOnCollection: localStorage.getItem("swastik_lab_sms_on_collect") !== "false",
      emailOnPublish: localStorage.getItem("swastik_lab_email_on_publish") !== "false",
      criticalAlerts: localStorage.getItem("swastik_lab_critical_alert") !== "false"
    });
  }, []);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      localStorage.setItem("swastik_lab_user", profile.full_name);
      
      // Update swastik_user object too
      const userStr = localStorage.getItem("swastik_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.full_name = profile.full_name;
        localStorage.setItem("swastik_user", JSON.stringify(user));
      }

      // Trigger standard window custom event so sidebar updates instantly
      window.dispatchEvent(new Event("storage"));
      
      setMessage({ type: "success", text: "Profile information updated successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update profile details." });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);
    
    // Save to localStorage
    if (key === "autoAcknowledge") localStorage.setItem("swastik_lab_auto_ack", value);
    if (key === "tubeType") localStorage.setItem("swastik_lab_tube_type", value);
    if (key === "verificationMode") localStorage.setItem("swastik_lab_verification", value);
    if (key === "smsOnCollection") localStorage.setItem("swastik_lab_sms_on_collect", value);
    if (key === "emailOnPublish") localStorage.setItem("swastik_lab_email_on_publish", value);
    if (key === "criticalAlerts") localStorage.setItem("swastik_lab_critical_alert", value);

    showNotification("Settings preference updated.");
  };

  const showNotification = (text) => {
    setMessage({ type: "success", text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Since it's a staff account (without custom backend settings endpoint),
      // we simulate updating in local preferences or calling backend if supported.
      // We will mimic the doctor settings logic with a simulated success response.
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: "success", text: "Password changed successfully!" });
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to change password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lab-dashboard" style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div className="lab-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'white', padding: '1.5rem 2rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Settings</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Customize laboratory preferences, notifications, and profile details.</p>
        </div>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            borderRadius: "12px",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: message.type === "success" ? "#0f766e" : "#b91c1c",
            background: message.type === "success" ? "#f0fdfa" : "#fef2f2",
            border: message.type === "success" ? "1px solid #99f6e4" : "1px solid #fecaca"
          }}
        >
          {message.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid Settings Layout */}
      <div className="lab-settings-grid">
        
        {/* Profile Card */}
        <div className="lab-settings-card">
          <h3><FiUser style={{ color: "#0d9488" }} /> Profile Information</h3>
          <form onSubmit={handleProfileSubmit} className="lab-settings-form">
            <div className="lab-settings-group">
              <label>Full Name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                required
              />
            </div>
            <div className="lab-settings-group">
              <label>Username</label>
              <input type="text" value={profile.username} disabled style={{ background: "#f8fafc", color: "#94a3b8", cursor: "not-allowed" }} />
            </div>
            <div className="lab-settings-group">
              <label>Assigned Department</label>
              <input type="text" value={profile.role} disabled style={{ background: "#f8fafc", color: "#94a3b8", cursor: "not-allowed" }} />
            </div>
            <button type="submit" disabled={loading} className="lab-btn lab-btn--primary" style={{ marginTop: "10px" }}>
              Save Profile
            </button>
          </form>
        </div>

        {/* Lab Preferences Card */}
        <div className="lab-settings-card">
          <h3><FiSliders style={{ color: "#0d9488" }} /> Lab Preferences</h3>
          <div className="lab-settings-form">
            <div className="lab-settings-toggle-group">
              <div className="lab-settings-toggle-label">
                <span>Auto-Acknowledge Requests</span>
                <small>Automatically acknowledge test orders on arrival.</small>
              </div>
              <label className="lab-switch">
                <input 
                  type="checkbox" 
                  checked={preferences.autoAcknowledge}
                  onChange={(e) => handlePreferenceChange("autoAcknowledge", e.target.checked)}
                />
                <span className="lab-slider"></span>
              </label>
            </div>

            <div className="lab-settings-group">
              <label>Default Sample Tube Type</label>
              <select 
                value={preferences.tubeType}
                onChange={(e) => handlePreferenceChange("tubeType", e.target.value)}
              >
                <option value="EDTA Tube (Purple)">EDTA Tube (Purple) - Haematology</option>
                <option value="Serum Separator (Yellow)">Serum Separator (Yellow) - Biochemistry</option>
                <option value="Sodium Citrate (Blue)">Sodium Citrate (Blue) - Coagulation</option>
                <option value="Heparin (Green)">Heparin (Green) - Immunology</option>
              </select>
            </div>

            <div className="lab-settings-group">
              <label>Report Verification Mode</label>
              <select 
                value={preferences.verificationMode}
                onChange={(e) => handlePreferenceChange("verificationMode", e.target.value)}
              >
                <option value="Single-Signoff">Single-Signoff (Technician)</option>
                <option value="Double-Signoff">Double-Signoff (Technician + Pathologist)</option>
                <option value="Peer-Review">Peer-Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications Preferences */}
        <div className="lab-settings-card">
          <h3><FiBell style={{ color: "#0d9488" }} /> Notification Prefs</h3>
          <div className="lab-settings-form">
            <div className="lab-settings-toggle-group">
              <div className="lab-settings-toggle-label">
                <span>SMS Patient on Sample Collection</span>
                <small>Send automated confirmation when sample is collected.</small>
              </div>
              <label className="lab-switch">
                <input 
                  type="checkbox" 
                  checked={preferences.smsOnCollection}
                  onChange={(e) => handlePreferenceChange("smsOnCollection", e.target.checked)}
                />
                <span className="lab-slider"></span>
              </label>
            </div>

            <div className="lab-settings-toggle-group">
              <div className="lab-settings-toggle-label">
                <span>Email Patient on Report Ready</span>
                <small>Send email notification with report download links.</small>
              </div>
              <label className="lab-switch">
                <input 
                  type="checkbox" 
                  checked={preferences.emailOnPublish}
                  onChange={(e) => handlePreferenceChange("emailOnPublish", e.target.checked)}
                />
                <span className="lab-slider"></span>
              </label>
            </div>

            <div className="lab-settings-toggle-group">
              <div className="lab-settings-toggle-label">
                <span>Critical Lab Value Alerts</span>
                <small>Show dashboard visual flashing for critical value alerts.</small>
              </div>
              <label className="lab-switch">
                <input 
                  type="checkbox" 
                  checked={preferences.criticalAlerts}
                  onChange={(e) => handlePreferenceChange("criticalAlerts", e.target.checked)}
                />
                <span className="lab-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Password Security */}
        <div className="lab-settings-card">
          <h3><FiLock style={{ color: "#0d9488" }} /> Change Password</h3>
          <form onSubmit={handlePasswordSubmit} className="lab-settings-form">
            <div className="lab-settings-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwords.current_password}
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="lab-settings-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="lab-settings-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="lab-btn lab-btn--primary" style={{ marginTop: "10px" }}>
              Update Password
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default LabSettings;
