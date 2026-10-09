import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../../assets/swasstiklogo.png";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar--scrolled">
      <div className="navbar__container">
        <Link to="/" className="navbar__logo">
          <img src={logo} alt="Swastik Hospital" />
          <span>Swastik Hospital</span>
        </Link>

        <div 
          className="navbar__actions" 
          style={{ 
            display: "flex", 
            flexDirection: "row", 
            gap: "1rem", 
            alignItems: "center", 
            borderTop: "none", 
            paddingTop: 0, 
            width: "auto" 
          }}
        >
          <button
            className="navbar__btn navbar__btn--primary"
            style={{ width: "auto" }}
            onClick={() => navigate("/patient-portal")}
          >
            Patient Portal
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

