import { Link } from "react-router-dom";
import "./ContactCTA.css";

function ContactCTA() {
  return (
    <section className="home-contact-cta" id="contact">
      <div className="home-contact-cta__inner">
        <h2 className="home-contact-cta__title">Get in Touch</h2>
        <p className="home-contact-cta__text">
          Have questions or ready to book an appointment? We're here to help.
        </p>
        <div className="home-contact-cta__actions">
          <Link to="/contact" className="home-contact-cta__btn home-contact-cta__btn--primary">
            Contact Us
          </Link>
          <Link to="/contact" className="home-contact-cta__btn home-contact-cta__btn--secondary">
            Book Now
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ContactCTA;
