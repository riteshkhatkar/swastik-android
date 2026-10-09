import React from "react";
import { Link } from "react-router-dom";
import { FaStethoscope, FaFlask, FaRegHospital } from "react-icons/fa";
import { FiCreditCard, FiSettings } from "react-icons/fi";
import "./StaffRoleLogin.css";

const ROLES = [
  {
    role: "doctor",
    title: "Doctor",
    icon: FaStethoscope,
    link: "/login?role=doctor",
    color: "#0ea5e9"
  },
  {
    role: "receptionist",
    title: "Receptionist",
    icon: FaRegHospital,
    link: "/login?role=receptionist",
    color: "#0d9488"
  },
  {
    role: "lab",
    title: "Lab Technician",
    icon: FaFlask,
    link: "/login?role=lab",
    color: "#f59e0b"
  },
  {
    role: "billing",
    title: "Billing",
    icon: FiCreditCard,
    link: "/login?role=billing",
    color: "#8b5cf6"
  },
  {
    role: "admin",
    title: "Admin",
    icon: FiSettings,
    link: "/login?role=admin",
    color: "#64748b"
  }
];

const StaffRoleLogin = () => {
  return (
    <section className="staff-role-login-section">
      <div className="staff-role-login__container">
        <div className="staff-role-login__header">
          <span className="staff-role-login__tagline">WORKSPACES</span>
          <h1 className="staff-role-login__title">Staff Role-Based Login</h1>
          <p className="staff-role-login__subtitle">
            Direct access to dedicated dashboard interfaces for Swastik Hospital staff members.
          </p>
        </div>
        <div className="staff-role-login__grid">
          {ROLES.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={index}
                to={item.link}
                className="staff-role-login__card"
              >
                <div
                  className="staff-role-login__tile"
                  style={{ "--theme-color": item.color }}
                >
                  <IconComponent className="staff-role-login__icon" />
                </div>
                <div className="staff-role-login__label">
                  <span className="staff-role-login__role-name">{item.title}</span>
                  <span className="staff-role-login__login-text">LOGIN</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StaffRoleLogin;
