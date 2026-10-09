import React, { useState, useCallback, useEffect } from "react";
import BillingSidebar from "./BillingSidebar";
import { FiMenu, FiX } from "react-icons/fi";
import { FaHospitalSymbol } from "react-icons/fa";
import DashboardView from "./views/DashboardView";
import BackToHomeButton from "../../components/BackToHomeButton";
import InvoicesView from "./views/InvoicesView";
import CreateInvoiceView from "./views/CreateInvoiceView";
import PaymentsView from "./views/PaymentsView";
import ClientsView from "./views/ClientsView";
import ReportsView from "./views/ReportsView";
import SettingsView from "./views/SettingsView";
import { api } from "../../api/service";
import "./BillingDashboard.css";

const WS_BASE = (() => {
  try {
    const u = new URL(process.env.REACT_APP_API_URL || "http://localhost:8000");
    return `${u.protocol === "https:" ? "wss" : "ws"}://${u.host}`;
  } catch {
    return "ws://localhost:8000";
  }
})();

const VIEW_TITLES = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  create: "Create Invoice",
  payments: "Payments",
  clients: "Clients (Patients)",
  reports: "Reports",
  settings: "Settings",
};

function BillingLayout({ userName, onLogout }) {
  const [currentView, setCurrentView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('billing_sidebar_collapsed') === 'true');

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('billing_sidebar_collapsed', newState);
      return newState;
    });
  };

  const [headerSearch, setHeaderSearch] = useState("");
  const [metrics, setMetrics] = useState({
    totalInvoices: 0,
    paid: 0,
    pending: 0,
    revenue: 0,
    outstanding: 0,
    revenue_today: 0,
    revenue_mtd: 0,
    collection_rate: "0%",
    revenue_trends: [],
    summary_cards: [],
    status_breakdown: [],
    payment_methods: [],
  });

  const loadMetrics = useCallback(async () => {
    try {
      const stats = await api.getBillingStats();
      const totalInvoices = Number(stats.total_invoices) || 0;
      const paid = Number(stats.paid_count) || 0;
      const pending = Number(stats.pending_count) || 0;
      const revenue = Number(stats.revenue) || Number(stats.revenue_mtd) || Number(stats.total_paid) || 0;
      const outstanding = Number(stats.outstanding) || 0;
      setMetrics({
        totalInvoices,
        paid,
        pending,
        revenue,
        outstanding,
        revenue_today: Number(stats.revenue_today) || 0,
        revenue_mtd: Number(stats.revenue_mtd) || revenue,
        collection_rate: stats.collection_rate ?? "0%",
        revenue_trends: stats.revenue_trends ?? [],
        summary_cards: stats.summary_cards ?? [],
        status_breakdown: stats.status_breakdown ?? [],
        payment_methods: stats.payment_methods ?? [],
      });
    } catch {
      try {
        const bills = await api.getBills(0, 500);
        if (Array.isArray(bills) && bills.length >= 0) {
          let totalPaid = 0;
          let paidCount = 0;
          let totalOutstanding = 0;
          bills.forEach((b) => {
            const total = Number(b.total) || 0;
            const insurance = Number(b.insurance_covered) || 0;
            const paidSum = (b.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
            totalPaid += paidSum;
            const patientPayable = total - insurance;
            const due = Math.max(0, patientPayable - paidSum);
            totalOutstanding += due;
            if (patientPayable <= 0 || paidSum >= patientPayable) paidCount++;
          });
          const totalInvoices = bills.length;
          const pendingCount = totalInvoices - paidCount;
          const collectionRate = totalPaid + totalOutstanding > 0
            ? ((totalPaid / (totalPaid + totalOutstanding)) * 100).toFixed(1) + "%"
            : "0%";
          setMetrics({
            totalInvoices,
            paid: paidCount,
            pending: pendingCount,
            revenue: totalPaid,
            outstanding: Math.round(totalOutstanding),
            revenue_today: 0,
            revenue_mtd: totalPaid,
            collection_rate: collectionRate,
            revenue_trends: [],
            summary_cards: [],
            status_breakdown: [
              { label: "Paid", count: paidCount, color: "#059669" },
              { label: "Pending", count: pendingCount, color: "#d97706" },
            ],
            payment_methods: [],
          });
        }
      } catch (_) { }
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/billing`);
    ws.onmessage = (ev) => {
      try {
        const { event } = JSON.parse(ev.data || "{}");
        if (event === "bill_created" || event === "payment_updated") loadMetrics();
      } catch { }
    };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [loadMetrics]);

  const [preSelectedPatient, setPreSelectedPatient] = useState(null);

  const handleNavigateToCreate = (patient = null) => {
    setPreSelectedPatient(patient);
    setCurrentView("create");
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView metrics={metrics} onRefresh={loadMetrics} />;
      case "invoices":
        return <InvoicesView />;
      case "create":
        return <CreateInvoiceView initialPatient={preSelectedPatient} onClearInitial={() => setPreSelectedPatient(null)} />;
      case "payments":
        return <PaymentsView />;
      case "clients":
        return <ClientsView onNavigateToInvoices={() => setCurrentView("invoices")} onNavigateToCreate={handleNavigateToCreate} />;
      case "reports":
        return <ReportsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView metrics={metrics} />;
    }
  };

  return (
    <div className={`billing-layout ${isCollapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Top Bar */}
      <header className="billing-mobile-header">
        <div className="billing-mobile-brand">
          <FaHospitalSymbol className="billing-mobile-logo-icon" />
          <span>Swastik Hospital</span>
        </div>
        <button className="billing-mobile-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <FiX /> : <FiMenu />}
        </button>
      </header>

      <BillingSidebar
        currentView={currentView}
        onSelect={(id) => { setCurrentView(id); setSidebarOpen(false); }}
        sidebarOpen={sidebarOpen}
        isCollapsed={isCollapsed}
        onToggle={() => {
          if (window.innerWidth < 768) {
            setSidebarOpen(!sidebarOpen);
          } else if (window.innerWidth <= 1024) {
            // Tablet: sidebarOpen controls the overlay or smaller width
            setSidebarOpen(!sidebarOpen);
          } else {
            toggleSidebar();
          }
        }}
        onLogout={onLogout}
      />

      <div className={`billing-main ${isCollapsed ? 'collapsed' : ''}`}>

        <div className="billing-content-area">
          <BackToHomeButton />
          {renderView()}
        </div>
      </div>
    </div>
  );
}

export default BillingLayout;
