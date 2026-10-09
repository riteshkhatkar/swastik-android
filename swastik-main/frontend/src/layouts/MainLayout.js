// MainLayout: wrapper for authenticated pages. Header (logo + role + logout), content, footer.
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { getStaffRole, clearStaffSession } from "../utils/staffAuth";
import swastikLogo from "../assets/swasstiklogo.png";
import "./MainLayout.css";

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("swastik_token");

  if (!token) return <Navigate to="/login" replace />;

  const role = getStaffRole();

  const handleLogout = () => {
    clearStaffSession();
    navigate("/login");
  };

  // Paths that use their own specialized layout with sidebars and mobile headers
  // Paths that use their own specialized layout with sidebars and mobile headers
  const isSpecializedLayout = /^\/(receptionist|doctor|lab|admin|billing)(\/|$)/.test(location.pathname);

  if (isSpecializedLayout) {
    return (
      <div className="main-layout specialized app-canvas">
        <main className="main-layout-content no-padding">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="main-layout app-canvas">
      <header className="main-layout-header app-header">
        <div className="main-layout-header-inner">
          <div className="main-layout-logo">
            <img src={swastikLogo} alt="Swastik Hospital" />
            <span>Swastik Hospital</span>
          </div>
          <div className="main-layout-header-right">
            <span className="main-layout-role-badge">{role}</span>
            <button type="button" className="main-layout-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-layout-content">
        <Outlet />
      </main>

      <footer className="main-layout-footer">
        <div className="main-layout-footer-content">
          <p className="main-layout-footer-copyright">
            © {new Date().getFullYear()} Swastik Hospital. All rights reserved. | Developed and managed by ORELSE Private Limited.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
