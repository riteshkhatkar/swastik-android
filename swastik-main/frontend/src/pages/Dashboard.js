import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getStaffRole } from "../utils/staffAuth";
import { api } from "../api/service";
import "./Dashboard.css";

const SECTIONS = [
  {
    id: "receptionist",
    label: "Receptionist",
    path: "/receptionist",
    description: "Registration & front desk",
    allowedRoles: ["receptionist", "admin"],
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
  },
  {
    id: "doctor",
    label: "Doctor",
    path: "/doctor",
    description: "Clinical & patient care",
    allowedRoles: ["doctor", "admin"],
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
  },
  {
    id: "lab",
    label: "Lab",
    path: "/lab",
    description: "Lab tests & results",
    allowedRoles: ["lab", "lab_technician", "admin"],
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><path d="M5.52 16h12.96"></path></svg>
  },
  {
    id: "admin",
    label: "Admin",
    path: "/admin",
    description: "System & user management",
    allowedRoles: ["admin"],
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
  },
  {
    id: "billing",
    label: "Billing",
    path: "/billing",
    description: "Bills & payments",
    allowedRoles: ["billing", "receptionist", "admin"],
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const role = getStaffRole();
  const [live, setLive] = useState({
    patients: null,
    opd: null,
    ipd: null,
    appointments: null,
    revenue: null,
    outstanding: null,
    bills: null,
  });
  const [loading, setLoading] = useState(true);

  const loadLive = useCallback(async () => {
    setLoading(true);
    try {
      const [counts, billing] = await Promise.all([
        api.getDashboardCounts().catch(() => ({})),
        api.getBillingStats().catch(() => ({})),
      ]);
      setLive({
        patients: counts.patients ?? null,
        opd: counts.opd ?? null,
        ipd: counts.ipd ?? null,
        appointments: counts.appointments ?? null,
        revenue: billing.revenue_today ?? billing.revenue_mtd ?? null,
        outstanding: billing.outstanding ?? null,
        bills: billing.total_invoices ?? null,
      });
    } catch (_) {
      setLive((p) => p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }
    loadLive();
  }, [loadLive, role, navigate]);

  const handleSectionClick = (sectionId) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section || !section.allowedRoles.includes(role)) return;
    navigate(section.path);
  };

  return (
    <div className="dashboard-page">
      <main className="dashboard-main p-6 sm:p-8 max-w-7xl mx-auto">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="dashboard-title font-display font-bold text-2xl lg:text-3xl text-slate-900 tracking-tight" style={{ margin: 0 }}>Dashboard</h2>
        </div>
        <p className="dashboard-subtitle text-sm text-slate-600 mt-2 mb-8">Select your section. You can only access the block for your role.</p>

        {/* Live stats from database */}
        <section className="dashboard-live-strip glass-panel" aria-label="Live hospital stats">
          <div className="dashboard-live-header">
            <span className="dashboard-live-badge inline-flex items-center px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Live</span>
            <button type="button" className="dashboard-live-refresh rounded-lg border border-slate-200 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 hover:text-slate-900 hover:bg-slate-200 transition-all" onClick={loadLive} disabled={loading} aria-label="Refresh stats">
              {loading ? "Syncing…" : "Refresh"}
            </button>
          </div>
          <div className="dashboard-live-cards grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="dashboard-live-card metric-card flex flex-col justify-between p-4">
              <span className="dashboard-live-value text-2xl font-display font-bold text-slate-900 tracking-tight block">{live.patients != null ? live.patients : "—"}</span>
              <span className="dashboard-live-label micro-label uppercase tracking-widest text-[10px] text-slate-500 mt-1 block">Patients</span>
            </div>
            <div className="dashboard-live-card metric-card flex flex-col justify-between p-4">
              <span className="dashboard-live-value text-2xl font-display font-bold text-slate-900 tracking-tight block">{live.opd != null ? live.opd : "—"}</span>
              <span className="dashboard-live-label micro-label uppercase tracking-widest text-[10px] text-slate-500 mt-1 block">OPD</span>
            </div>
            <div className="dashboard-live-card metric-card flex flex-col justify-between p-4">
              <span className="dashboard-live-value text-2xl font-display font-bold text-slate-900 tracking-tight block">{live.appointments != null ? live.appointments : "—"}</span>
              <span className="dashboard-live-label micro-label uppercase tracking-widest text-[10px] text-slate-500 mt-1 block">Scheduled</span>
            </div>
            <div className="dashboard-live-card metric-card flex flex-col justify-between p-4">
              <span className="dashboard-live-value text-2xl font-display font-bold text-slate-900 tracking-tight block">{live.ipd != null ? live.ipd : "—"}</span>
              <span className="dashboard-live-label micro-label uppercase tracking-widest text-[10px] text-slate-500 mt-1 block">IPD</span>
            </div>
            <div className="dashboard-live-card metric-card flex flex-col justify-between p-4">
              <span className="dashboard-live-value text-2xl font-display font-bold text-slate-900 tracking-tight block">{live.revenue != null ? `₹${Number(live.revenue).toLocaleString()}` : "—"}</span>
              <span className="dashboard-live-label micro-label uppercase tracking-widest text-[10px] text-slate-500 mt-1 block">Revenue</span>
            </div>
            <div className="dashboard-live-card metric-card flex flex-col justify-between p-4">
              <span className="dashboard-live-value text-2xl font-display font-bold text-slate-900 tracking-tight block">{live.outstanding != null ? `₹${Number(live.outstanding).toLocaleString()}` : "—"}</span>
              <span className="dashboard-live-label micro-label uppercase tracking-widest text-[10px] text-slate-500 mt-1 block">Outstanding</span>
            </div>
            <div className="dashboard-live-card metric-card flex flex-col justify-between p-4">
              <span className="dashboard-live-value text-2xl font-display font-bold text-slate-900 tracking-tight block">{live.bills != null ? live.bills : "—"}</span>
              <span className="dashboard-live-label micro-label uppercase tracking-widest text-[10px] text-slate-500 mt-1 block">Bills</span>
            </div>
          </div>
        </section>

        <div className="dashboard-blocks grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-8">
          {SECTIONS.map((section) => {
            const isEnabled = section.allowedRoles.includes(role);
            return (
              <button
                key={section.id}
                type="button"
                className={`dashboard-block panel-elevated flex flex-col items-center justify-center p-8 transition-all duration-300 text-center ${isEnabled ? "hover:shadow-md hover:border-indigo-200 hover:-translate-y-1 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                onClick={() => handleSectionClick(section.id)}
                disabled={!isEnabled}
                title={isEnabled ? `Open ${section.label}` : "Access restricted to your role"}
              >
                <div className="dashboard-block-icon rounded-full p-4 bg-slate-100 transition-colors">
                  {section.icon}
                </div>
                <span className="dashboard-block-label font-display font-semibold text-lg text-slate-900 mt-4 block">{section.label}</span>
                <span className="dashboard-block-desc text-sm text-slate-600 mt-2 block">{section.description}</span>
                {!isEnabled && <span className="dashboard-block-lock flex items-center gap-1 absolute top-4 right-4 bg-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Locked</span>}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
