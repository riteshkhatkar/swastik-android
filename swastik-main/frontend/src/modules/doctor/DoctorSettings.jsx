import React, { useState, useEffect } from "react";
import { api } from "../../api/service";
import { FiUser, FiLock, FiSave, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import "./doctor.css";

function DoctorSettings() {
    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        phone: "",
        specialization: "",
        qualification: "",
        department: ""
    });
    const [passwords, setPasswords] = useState({
        current_password: "",
        new_password: "",
        confirm_password: ""
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const userStr = localStorage.getItem("swastik_user");
            if (!userStr) return;
            const user = JSON.parse(userStr);
            const data = await api.getDoctorProfile(user.username);
            setProfile(data);
        } catch (err) {
            console.error("Failed to fetch profile", err);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });
        try {
            const userStr = localStorage.getItem("swastik_user");
            const user = JSON.parse(userStr);
            await api.updateDoctorProfile(user.username, profile);
            setMessage({ type: "success", text: "Profile updated successfully!" });
            
            // Update local storage if name changed
            const newUser = { ...user, full_name: profile.full_name };
            localStorage.setItem("swastik_user", JSON.stringify(newUser));
        } catch (err) {
            setMessage({ type: "error", text: err.response?.data?.detail || "Failed to update profile" });
        } finally {
            setLoading(false);
        }
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
            const userStr = localStorage.getItem("swastik_user");
            const user = JSON.parse(userStr);
            await api.changeDoctorPassword(user.username, {
                current_password: passwords.current_password,
                new_password: passwords.new_password
            });
            setMessage({ type: "success", text: "Password changed successfully!" });
            setPasswords({ current_password: "", new_password: "", confirm_password: "" });
        } catch (err) {
            setMessage({ type: "error", text: err.response?.data?.detail || "Failed to change password" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="doctor-settings-page">
            <h2 className="doctor-page-title">Settings & Profile</h2>
            
            {message.text && (
                <div className={`doctor-alert ${message.type === 'success' ? 'doctor-alert--success' : 'doctor-alert--error'}`}>
                    {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                    {message.text}
                </div>
            )}

            <div className="doctor-settings-grid">
                <div className="doctor-card">
                    <h3 className="doctor-card__heading"><FiUser /> Profile Information</h3>
                    <form onSubmit={handleProfileSubmit} className="doctor-settings-form">
                        <div className="doctor-form-group">
                            <label>Full Name</label>
                            <input 
                                type="text" 
                                value={profile.full_name} 
                                onChange={(e) => setProfile({...profile, full_name: e.target.value})} 
                                className="doctor-input"
                                required
                            />
                        </div>
                        <div className="doctor-form-row">
                            <div className="doctor-form-group">
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    value={profile.email} 
                                    onChange={(e) => setProfile({...profile, email: e.target.value})} 
                                    className="doctor-input"
                                    required
                                />
                            </div>
                            <div className="doctor-form-group">
                                <label>Phone Number</label>
                                <input 
                                    type="text" 
                                    value={profile.phone} 
                                    onChange={(e) => setProfile({...profile, phone: e.target.value})} 
                                    className="doctor-input"
                                />
                            </div>
                        </div>
                        <div className="doctor-form-group">
                            <label>Specialization</label>
                            <input 
                                type="text" 
                                value={profile.specialization} 
                                onChange={(e) => setProfile({...profile, specialization: e.target.value})} 
                                className="doctor-input"
                            />
                        </div>
                        <div className="doctor-form-group">
                            <label>Qualification</label>
                            <textarea 
                                value={profile.qualification} 
                                onChange={(e) => setProfile({...profile, qualification: e.target.value})} 
                                className="doctor-input"
                                rows="3"
                            />
                        </div>
                        <button type="submit" className="doctor-btn doctor-btn--primary" disabled={loading}>
                            <FiSave /> {loading ? "Saving..." : "Update Profile"}
                        </button>
                    </form>
                </div>

                <div className="doctor-card">
                    <h3 className="doctor-card__heading"><FiLock /> Security Settings</h3>
                    <form onSubmit={handlePasswordSubmit} className="doctor-settings-form">
                        <div className="doctor-form-group">
                            <label>Current Password</label>
                            <input 
                                type="password" 
                                value={passwords.current_password} 
                                onChange={(e) => setPasswords({...passwords, current_password: e.target.value})} 
                                className="doctor-input"
                                required
                            />
                        </div>
                        <div className="doctor-form-group">
                            <label>New Password</label>
                            <input 
                                type="password" 
                                value={passwords.new_password} 
                                onChange={(e) => setPasswords({...passwords, new_password: e.target.value})} 
                                className="doctor-input"
                                required
                            />
                        </div>
                        <div className="doctor-form-group">
                            <label>Confirm New Password</label>
                            <input 
                                type="password" 
                                value={passwords.confirm_password} 
                                onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})} 
                                className="doctor-input"
                                required
                            />
                        </div>
                        <button type="submit" className="doctor-btn doctor-btn--primary" disabled={loading}>
                            <FiLock /> {loading ? "Updating..." : "Change Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default DoctorSettings;
