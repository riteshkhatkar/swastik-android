import React from "react";
import "./Services.css";

const SERVICES_DATA = [
  {
    id: 1,
    title: "Depression Treatment",
    description: "Evidence-based therapeutic interventions for mood disorders and emotional well-being.",
    icon: "🧠"
  },
  {
    id: 2,
    title: "Anxiety Disorders",
    description: "Expert care for generalized anxiety, panic disorders, and social phobia management.",
    icon: "🛡️"
  },
  {
    id: 3,
    title: "Bipolar Disorder",
    description: "Comprehensive stabilization and long-term management strategies for mood swings.",
    icon: "⚖️"
  },
  {
    id: 4,
    title: "Addiction Therapy",
    description: "Structured recovery programs focusing on holistic rehabilitation and relapse prevention.",
    icon: "🌱"
  },
  {
    id: 5,
    title: "Family Counseling",
    description: "Strengthening relationships and providing support for families navigating mental health challenges.",
    icon: "👪"
  },
  {
    id: 6,
    title: "Child Psychiatry",
    description: "Specialized mental health support for children and adolescents in a nurturing environment.",
    icon: "🎈"
  }
];

const Services = () => {
  return (
    <section id="services" className="services-section">
      <div className="services__container">
        <div className="services__header">
          <span className="services__tagline">Our Specialization</span>
          <h2 className="services__title">Mental Health Services</h2>
          <p className="services__subtitle">
            We provide a wide range of psychiatric and psychological services tailored to your individual needs.
          </p>
        </div>

        <div className="services__grid">
          {SERVICES_DATA.map((service) => (
            <div key={service.id} className="service-card">
              <div className="service-card__icon">{service.icon}</div>
              <h3 className="service-card__title">{service.title}</h3>
              <p className="service-card__description">{service.description}</p>
              <button className="service-card__link">Learn More &rarr;</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
