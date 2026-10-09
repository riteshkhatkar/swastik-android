// Wraps all /registration/* routes. Shows RegistrationHeader + Outlet + RegistrationFooter.
// Header and footer appear only on registration pages, not elsewhere.
import { Outlet } from "react-router-dom";
import "./RegistrationLayout.css";
import RegistrationHeader from "../components/navbar/RegistrationHeader";
import RegistrationFooter from "../components/Footer/RegistrationFooter";

function RegistrationLayout() {
  return (
    <div className="registration-layout">
      <RegistrationHeader />
      <main className="registration-main">
        <Outlet />
      </main>
      <RegistrationFooter />
    </div>
  );
}

export default RegistrationLayout;
