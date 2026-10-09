import React from "react";
import "./Stats.css";

const stats = [
  { label: "Happy Patients", value: "10,000+" },
  { label: "Expert Doctors", value: "25+" },
  { label: "Years Experience", value: "15+" },
  { label: "Modern Rooms", value: "50+" },
];

const Stats = () => {
  return (
    <section className="stats-section">
      <div className="stats__container">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Stats;
