// Registration section footer. Used only in RegistrationLayout.
import "./RegistrationFooter.css";

function RegistrationFooter() {
  return (
    <footer className="registration-footer">
      <div className="registration-footer-content">
        <div className="registration-footer-left">
          <p className="registration-copyright">
            © {new Date().getFullYear()} Swastik Hospital. All rights reserved. | Developed and managed by ORELSE Private Limited.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default RegistrationFooter;
