import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

import { getStaffRole } from "../utils/staffAuth";

const BackToHomeButton = () => {
  const navigate = useNavigate();
  const role = getStaffRole();

  const handleBack = () => {
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <button
      onClick={handleBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "transparent",
        border: "1px solid transparent",
        color: "#64748b",
        padding: "4px 8px",
        borderRadius: "6px",
        fontSize: "0.825rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: "1rem",
        width: "fit-content",
        alignSelf: "flex-start",
        boxShadow: "none"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#0d9488";
        e.currentTarget.style.backgroundColor = "#f0fdfa";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#64748b";
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <FiArrowLeft style={{ fontSize: "0.95rem" }} />
      <span>Back to Home</span>
    </button>
  );
};

export default BackToHomeButton;
