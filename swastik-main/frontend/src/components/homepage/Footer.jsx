import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";
import logo from "../../assets/swasstiklogo.png";

const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="footer__container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <img src={logo} alt="Swastik Hospital" />
              <span>Swastik Hospital</span>
            </Link>
            <p className="footer__description">
              Dedicated to providing the highest quality psychiatric and mental health care with compassion and excellence.
            </p>
            <div className="footer__social">
              <span className="footer__social-icon">FB</span>
              <span className="footer__social-icon">TW</span>
              <span className="footer__social-icon">IG</span>
              <span className="footer__social-icon">LI</span>
            </div>
          </div>

          <div className="footer__links-group">
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/#about">About Us</Link></li>
              <li><Link to="/#services">Services</Link></li>
              <li><Link to="/#doctors">Our Doctors</Link></li>
            </ul>
          </div>

          <div className="footer__links-group">
            <h3>Portals</h3>
            <ul>
              <li><Link to="/patient-portal">Patient Portal</Link></li>
              <li><Link to="/login">Hospital Staff Login</Link></li>
              <li><Link to="/patient-portal/appointments">Book Appointment</Link></li>
            </ul>
          </div>

          <div className="footer__contact" id="contact">
            <h3>Contact Us</h3>
            <p><strong>Address:</strong> 123 Health Ave, Medical District, City</p>
            <p><strong>Phone:</strong> +91 123 456 7890</p>
            <p><strong>Email:</strong> info@swastikhospital.com</p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} Swastik Hospital. All rights reserved. | Developed and managed by ORELSE Private Limited.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
