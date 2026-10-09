import React from "react";
import "./doctor.css";

function DoctorPlaceholder({ title }) {
  return (
    <>
      <h2 className="doctor-page-title">{title}</h2>
      <div className="doctor-card">
        <p className="doctor-emr-subtitle">This section is under development.</p>
        <p>Content for {title} will be available in a future release.</p>
      </div>
    </>
  );
}

export default DoctorPlaceholder;
