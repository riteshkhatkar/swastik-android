import { FiHome, FiFileText, FiPlusCircle, FiCreditCard, FiUsers, FiBarChart2, FiSettings, FiLogOut, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { FaHospitalSymbol } from "react-icons/fa";

const ICONS = {
  dashboard: FiHome,
  invoices: FiFileText,
  create: FiPlusCircle,
  payments: FiCreditCard,
  clients: FiUsers,
  reports: FiBarChart2,
  settings: FiSettings,
};

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "invoices", label: "Invoices", icon: "invoices" },
  { id: "create", label: "Create Invoice", icon: "create" },
  { id: "payments", label: "Payments", icon: "payments" },
  { id: "clients", label: "Patients", icon: "clients" },
  { id: "reports", label: "Reports", icon: "reports" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function BillingSidebar({ currentView, onSelect, sidebarOpen, isCollapsed, onToggle, onLogout }) {
  return (
    <>
      <div className={`billing-sidebar app-sidebar no-print ${sidebarOpen ? "billing-sidebar--open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        <button className="billing-sidebar-toggle" onClick={onToggle}>
          {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
        
        <div className="billing-sidebar__brand">
          <div className="billing-sidebar__logo-container">
            <FaHospitalSymbol className="billing-sidebar__logo-icon" />
            <span className="billing-sidebar__title">Swastik Hospital</span>
          </div>
          <button className="billing-sidebar-close" onClick={onToggle}>
            <FiX className="billing-close-icon" />
          </button>
        </div>
        
        <nav className="billing-sidebar__nav">
          {MENU_ITEMS.map((item) => {
            const IconComponent = ICONS[item.icon];
            return (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${currentView === item.id ? "nav-item-active" : ""}`}
                onClick={() => onSelect(item.id)}
                title={isCollapsed ? item.label : ""}
              >
                <IconComponent className="billing-sidebar__icon" />
                <span className="billing-sidebar__label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="billing-sidebar__footer">
          <div className="billing-sidebar__user">
            <div className="billing-sidebar__avatar">B</div>
            <div className="billing-sidebar__user-info">
              <span className="billing-sidebar__user-name">Billing Dept</span>
              <span className="billing-sidebar__user-role">Finance</span>
            </div>
          </div>
          <button className="billing-sidebar__logout" onClick={onLogout}>
            <FiLogOut className="billing-sidebar__logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>
      {sidebarOpen && <div className="billing-sidebar__overlay no-print" onClick={onToggle} aria-hidden="true" />}
    </>
  );
}

export default BillingSidebar;
