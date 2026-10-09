import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api/service";
import "./AdminPages.css";
import jsPDF from "jspdf";
import "jspdf-autotable";

function StatRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: "0.9rem", color: "#52687a", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "0.95rem", fontWeight: 700, color: accent || "#1a2b3c" }}>{value}</span>
    </div>
  );
}

export default function AdminDepartments() {
  const [counts, setCounts] = useState({});
  const [labStats, setLabStats] = useState({});
  const [billingStats, setBillingStats] = useState({});
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l, b, p] = await Promise.all([
        api.getDashboardCounts().catch(() => ({})),
        api.getLabStats(true).catch(() => ({})),
        api.getBillingStats().catch(() => ({})),
        api.getAdminLivePatients(5).catch(() => []),
      ]);
      setCounts(c || {});
      setLabStats(l || {});
      setBillingStats(b || {});
      setPatients(Array.isArray(p) ? p : []);
      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
    } catch (_) { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const fmt = (v) => Number(v || 0).toLocaleString("en-IN");

  const generatePDF = () => {
    if (loading) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Swastik Hospital – Department Monitoring", 14, 22);
    doc.setFontSize(12);
    // Stats tables
    const sections = [];
    // OPD / Reception
    sections.push({
      title: "OPD / Reception", rows: [
        ["OPD Visits Today", fmt(counts.opd)],
        ["Active IPD Admissions", fmt(counts.ipd)],
        ["Total Patients Registered", fmt(counts.patients)],
      ]
    });
    // Doctors
    sections.push({
      title: "Doctors", rows: [
        ["Total Doctors", fmt(counts.doctors)],
        ["OPD Consultations Today", fmt(counts.opd)],
        ["IPD Active Patients", fmt(counts.ipd)],
      ]
    });
    // Lab
    sections.push({
      title: "Laboratory", rows: [
        ["Tests Requested Today", fmt(labStats.total_requests_today)],
        ["Tests In Process", fmt(labStats.tests_in_process)],
        ["Results Entered", fmt(labStats.results_entered)],
        ["Critical Alerts", fmt(labStats.critical_alerts)],
        ["Avg. Turnaround Time", `${labStats.average_wait_time_minutes || 0} min`],
      ]
    });
    // Billing
    sections.push({
      title: "Billing", rows: [
        ["Revenue Today", `₹ ${fmt(billingStats.revenue_today)}`],
        ["Revenue (MTD)", `₹ ${fmt(billingStats.revenue_mtd)}`],
        ["Outstanding Dues", `₹ ${fmt(billingStats.outstanding)}`],
        ["Total Invoices", fmt(billingStats.total_invoices)],
        ["Paid Invoices", fmt(billingStats.paid_count)],
        ["Pending Invoices", fmt(billingStats.pending_count)],
        ["Collection Rate", billingStats.collection_rate || "—"],
      ]
    });
    let y = 30;
    sections.forEach(sec => {
      doc.autoTable({ startY: y, head: [[sec.title]], body: [], theme: "plain", headStyles: { fillColor: [13, 148, 136], textColor: 255 } });
      y = doc.lastAutoTable.finalY + 2;
      doc.autoTable({ startY: y, head: [["Metric", "Value"]], body: sec.rows, theme: "grid", headStyles: { fillColor: [13, 148, 136] } });
      y = doc.lastAutoTable.finalY + 6;
    });
    // Recent patients list
    if (patients.length) {
      doc.autoTable({ startY: y, head: [["Recent Patients"]], body: [], theme: "plain", headStyles: { fillColor: [13, 148, 136] } });
      y = doc.lastAutoTable.finalY + 2;
      const patRows = patients.map(p => [p.name, p.uhid, `${p.gender || "—"}, ${p.age || "—"}y`, p.phone || ""]);
      doc.autoTable({ startY: y, head: [["Name", "UHID", "Details", "Phone"]], body: patRows, theme: "grid", headStyles: { fillColor: [13, 148, 136] } });
    }
    doc.save("department_monitoring.pdf");
  };

  return (
    <div className="admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <h1 className="admin-page__title">Department Monitoring</h1>
          <p className="admin-page__subtitle">{loading ? "Loading live data…" : `Live · Refreshed ${lastRefresh} · Auto-refresh 30s`}</p>
        </div>
        <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
        <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={generatePDF} disabled={loading}>
          Download PDF
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {/* OPD / Reception */}
        <section className="admin-section" style={{ margin: 0 }}>
          <h2 className="admin-section__title">🏥 OPD / Reception</h2>
          <StatRow label="OPD Visits Today" value={loading ? "…" : fmt(counts.opd)} />
          <StatRow label="Active IPD Admissions" value={loading ? "…" : fmt(counts.ipd)} />
          <StatRow label="Total Patients Registered" value={loading ? "…" : fmt(counts.patients)} />
          {patients.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Recent Patients</p>
              {patients.map(p => (
                <div key={p._id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "5px 0", borderBottom: "1px solid #f8fafc", color: "#334155" }}>
                  <span><strong>{p.name}</strong> — {p.uhid}</span>
                  <span style={{ color: "#64748b" }}>{p.gender || "—"}, {p.age || "—"}y</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Doctors */}
        <section className="admin-section" style={{ margin: 0 }}>
          <h2 className="admin-section__title">👨‍⚕️ Doctors</h2>
          <StatRow label="Total Doctors" value={loading ? "…" : fmt(counts.doctors)} />
          <StatRow label="OPD Consultations Today" value={loading ? "…" : fmt(counts.opd)} />
          <StatRow label="IPD Active Patients" value={loading ? "…" : fmt(counts.ipd)} />
        </section>

        {/* Lab */}
        <section className="admin-section" style={{ margin: 0 }}>
          <h2 className="admin-section__title">🔬 Laboratory</h2>
          <StatRow label="Tests Requested Today" value={loading ? "…" : fmt(labStats.total_requests_today)} />
          <StatRow label="Tests In Process" value={loading ? "…" : fmt(labStats.tests_in_process)} />
          <StatRow label="Results Entered" value={loading ? "…" : fmt(labStats.results_entered)} />
          <StatRow label="Critical Alerts" value={loading ? "…" : fmt(labStats.critical_alerts)} accent={Number(labStats.critical_alerts) > 0 ? "#b91c1c" : "#16a34a"} />
          <StatRow label="Avg. Turnaround Time" value={loading ? "…" : `${labStats.average_wait_time_minutes || 0} min`} />
        </section>

        {/* Billing */}
        <section className="admin-section" style={{ margin: 0 }}>
          <h2 className="admin-section__title">💰 Billing</h2>
          <StatRow label="Revenue Today" value={loading ? "…" : `₹ ${fmt(billingStats.revenue_today)}`} accent="#0d9488" />
          <StatRow label="Revenue (Month-to-Date)" value={loading ? "…" : `₹ ${fmt(billingStats.revenue_mtd)}`} accent="#0d9488" />
          <StatRow label="Outstanding Dues" value={loading ? "…" : `₹ ${fmt(billingStats.outstanding)}`} accent={Number(billingStats.outstanding) > 0 ? "#b91c1c" : "#64748b"} />
          <StatRow label="Total Invoices" value={loading ? "…" : fmt(billingStats.total_invoices)} />
          <StatRow label="Paid Invoices" value={loading ? "…" : fmt(billingStats.paid_count)} accent="#16a34a" />
          <StatRow label="Pending Invoices" value={loading ? "…" : fmt(billingStats.pending_count)} accent={Number(billingStats.pending_count) > 0 ? "#d97706" : "#64748b"} />
          <StatRow label="Collection Rate" value={loading ? "…" : billingStats.collection_rate || "—"} accent="#0d9488" />
        </section>

        {/* Payment Methods */}
        {billingStats.payment_methods && billingStats.payment_methods.length > 0 && (
          <section className="admin-section" style={{ margin: 0 }}>
            <h2 className="admin-section__title">💳 Payment Methods</h2>
            {billingStats.payment_methods.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "0.9rem", color: "#52687a", fontWeight: 500 }}>{m.label}</span>
                <span style={{ background: "#f0fdfa", color: "#0d9488", fontWeight: 700, fontSize: "0.85rem", padding: "3px 10px", borderRadius: 20 }}>{m.count} txns</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
