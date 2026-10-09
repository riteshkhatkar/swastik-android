import React from "react";
import { Link } from "react-router-dom";
import { FaStethoscope, FaFlask, FaRegHospital } from "react-icons/fa";
import { FiCreditCard, FiSettings } from "react-icons/fi";
import "./RoleLogin.css";

const ROLES = [
  {
    role: "doctor",
    title: "Doctor",
    subtitle: "Login",
    icon: FaStethoscope,
    link: "/login?role=doctor",
    color: "#3b82f6"
  },
  {
    role: "receptionist",
    title: "Receptionist",
    subtitle: "Login",
    icon: FaRegHospital,
    link: "/login?role=receptionist",
    color: "#10b981"
  },
  {
    role: "lab",
    title: "Lab Technician",
    subtitle: "Login",
    icon: FaFlask,
    link: "/login?role=lab",
    color: "#f59e0b"
  },
  {
    role: "billing",
    title: "Billing",
    subtitle: "Login",
    icon: FiCreditCard,
    link: "/login?role=billing",
    color: "#8b5cf6"
  },
  {
    role: "admin",
    title: "Admin",
    subtitle: "Login",
    icon: FiSettings,
    link: "/login?role=admin",
    color: "#6b7280"
  }
];

const RoleLogin = () => {
  return (
    <section className="role-login-section" id="role-login">
      <div className="role-login__container">
        <div className="role-login__header">
          <span className="role-login__tagline">Workspaces</span>
          <h2 className="role-login__title">Staff Role-Based Login</h2>
          <p className="role-login__subtitle">
            Direct access to dedicated dashboard interfaces for Swastik Hospital staff members.
          </p>
        </div>
        <div className="role-login__grid">
          {ROLES.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={index}
                to={item.link}
                className="role-login__card"
              >
                <div 
                  className="role-login__tile" 
                  style={{ "--theme-color": item.color }}
                >
                  <IconComponent className="role-login__icon" />
                </div>
                <div className="role-login__label">
                  <span className="role-login__label-title">{item.title}</span>
                  <span className="role-login__label-subtitle">{item.subtitle}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RoleLogin;
