import React from "react";
import "./About.css";

const About = () => {
  return (
    <section id="about" className="about-section">
      <div className="about__container">
        <div className="about__grid">
          <div className="about__content">
            <span className="about__tagline">Our Vision</span>
            <h2 className="about__title">Healing Minds with Compassion & Confidential Care</h2>
            <p className="about__text">
              At Swastik Hospital, we believe that mental health is as important as physical health. Our team of experienced psychiatrists and therapists is dedicated to providing compassionate, evidence-based care in a safe and supportive environment.
            </p>

            <div className="about__features">
              <div className="about__feature">
                <div className="about__feature-icon">👨‍⚕️</div>
                <div className="about__feature-text">
                  <h3>Expert Team</h3>
                  <p>Specialists trained in modern psychiatric and psychological care.</p>
                </div>
              </div>
              <div className="about__feature">
                <div className="about__feature-icon">🔒</div>
                <div className="about__feature-text">
                  <h3>Total Privacy</h3>
                  <p>Your journey with us is kept completely confidential and professional.</p>
                </div>
              </div>
              <div className="about__feature">
                <div className="about__feature-icon">🆘</div>
                <div className="about__feature-text">
                  <h3>24/7 Support</h3>
                  <p>Round-the-clock emergency care and monitoring for our patients.</p>
                </div>
              </div>
            </div>

            <button className="about__btn">Our Journey &rarr;</button>
          </div>

          <div className="about__visual">
            <div className="about__image-container">
              {/* This would be a high quality image of the hospital or doctors */}
              <div className="about__image-placeholder">
                <span className="about__image-text">Dedicated to Excellence in Psychiatric Care</span>
              </div>
              <div className="about__experience-badge">
                <span className="about__experience-years">15+</span>
                <span className="about__experience-label">Years of Excellence</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
