import { Link } from "react-router-dom";
import "./Hero.css";

function Hero() {
  return (
    <section className="home-hero" id="hero">
      <div className="home-hero__inner">
        <h1 className="home-hero__headline">
          Transforming Healthcare with Compassion & Care
        </h1>
        <p className="home-hero__subheadline">
          Your trusted partner in health. Expert care, modern facilities, and a commitment to your well-being.
        </p>
        <div className="home-hero__actions">
          <Link to="/patient-portal/appointments" className="home-hero__cta home-hero__cta--primary">
            Book Appointment
          </Link>

          <Link to="/patient-portal" className="home-hero__cta home-hero__cta--secondary">
            Access Patient Portal
          </Link>

        </div>
        <div className="home-hero__contact">
          <a href="tel:+911234567890" className="home-hero__link">
            +91 123 456 7890
          </a>
          <span className="home-hero__divider">|</span>
          <a href="mailto:info@swastikhospital.com" className="home-hero__link">
            info@swastikhospital.com
          </a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
