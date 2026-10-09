/**
 * Contact page with form. On submit, opens WhatsApp with pre-filled message:
 * "Hello, my name is [Name], Phone: [Phone], Message: [Message]"
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import "./Contact.css";

const WHATSAPP_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || "917559316330";

function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function Contact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = `Hello, my name is ${name || "—"}, Phone: ${phone || "—"}, Message: ${message || "—"}`;
    window.open(buildWhatsAppUrl(text), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="contact-page">
      <Navbar />
      <main className="contact-main">
        <div className="contact-card">
          <h1 className="contact-title">Contact Us</h1>
          <p className="contact-intro">
            Fill in the details below and we’ll open WhatsApp so you can send your message directly.
          </p>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="contact-input"
              />
            </div>
            <div className="contact-field">
              <label htmlFor="contact-phone">Phone Number</label>
              <input
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="contact-input"
              />
            </div>
            <div className="contact-field">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message..."
                rows={4}
                className="contact-input contact-textarea"
              />
            </div>
            <button type="submit" className="contact-submit">
              Send via WhatsApp
            </button>
          </form>
          <p className="contact-hint">
            You’ll be redirected to WhatsApp with your details pre-filled. You can edit the message there before sending.
          </p>
        </div>
      </main>
      <footer className="contact-footer">
        <Link to="/">← Back to Home</Link>
      </footer>
    </div>
  );
}

export default Contact;
