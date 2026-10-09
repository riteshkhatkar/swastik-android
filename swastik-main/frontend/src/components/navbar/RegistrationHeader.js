// Registration section header: back button, logo, title. Used only in RegistrationLayout.
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./RegistrationHeader.css";
import swastikLogo from "../../assets/swasstiklogo.png";

function RegistrationHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHub = location.pathname === "/registration" || location.pathname === "/registration/";

  const handleBack = () => {
    if (isHub) {
      navigate("/dashboard");
    } else {
      navigate("/registration");
    }
  };

  return (
    <header className="registration-header">
      <div className="registration-header-left">
        <button
          className="registration-back-btn"
          onClick={handleBack}
          title={isHub ? "Back to Dashboard" : "Back to Registration"}
        >
          <FaArrowLeft />
        </button>
        <div className="registration-logo-title">
          <img src={swastikLogo} alt="Swastik Hospital" className="registration-header-logo" />
          <div className="registration-header-text">
            <h1>Swastik Hospital</h1>
            <p className="registration-tagline">Digital Healthcare Management System</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default RegistrationHeader;
