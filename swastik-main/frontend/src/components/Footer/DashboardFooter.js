// Reusable footer for Dashboard, Analytics, Clinical, Reports, etc.
import "./DashboardFooter.css";

function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="dashboard-footer">
      <div className="footer-content">
        <div className="footer-left">
          <p className="copyright">
            © {year} Swastik Hospital. All rights reserved. | Developed and managed by ORELSE Private Limited.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default DashboardFooter;
