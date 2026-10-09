import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api/service";
import "./AdminPages.css";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function AdminFinancial() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminStats(); // live billing stats
      setStats(data);
    } catch (e) {
      console.error("Failed to load financial stats", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generatePDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Swastik Hospital – Financial Overview", 14, 22);
    doc.setFontSize(12);
    // Summary table
    const summaryRows = [
      ["Revenue (MTD)", stats.revenue_mtd ? `₹${(stats.revenue_mtd / 100000).toFixed(1)}L` : "—"],
      ["Outstanding", stats.outstanding ? `₹${(stats.outstanding / 1000).toFixed(0)}K` : "—"],
      ["Collection %", stats.collection_rate || "—"],
      ["Total Invoices", stats.total_invoices?.toString() || "—"]
    ];
    doc.autoTable({ startY: 30, head: [["Metric", "Value"]], body: summaryRows, theme: "grid", headStyles: { fillColor: [13, 148, 136] } });
    // Payment methods
    const methodRows = (stats.payment_methods || []).map(m => [m.label, m.count]);
    if (methodRows.length) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 10, head: [["Method", "Count"]], body: methodRows, theme: "grid", headStyles: { fillColor: [13, 148, 136] } });
    }
    // Revenue trends
    const trendRows = (stats.revenue_trends || []).map(t => [t.month, `${t.revenue}L`]);
    if (trendRows.length) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 10, head: [["Month", "Revenue (L)"]], body: trendRows, theme: "grid", headStyles: { fillColor: [13, 148, 136] } });
    }
    doc.save("financial_overview.pdf");
  };

  if (loading) return <p className="admin-loading">Loading financial data…</p>;

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Financial Overview</h1>
      <p className="admin-page__subtitle">Live billing statistics and trends.</p>
      <button className="admin-btn admin-btn--primary" onClick={generatePDF}>Download PDF</button>
      <section className="admin-section">
        <h2 className="admin-section__title">Summary</h2>
        <div className="admin-cards">
          <div className="admin-card"><h3>Revenue (MTD)</h3><p>{stats.revenue_mtd ? `₹${(stats.revenue_mtd / 100000).toFixed(1)}L` : "—"}</p></div>
          <div className="admin-card"><h3>Outstanding</h3><p>{stats.outstanding ? `₹${(stats.outstanding / 1000).toFixed(0)}K` : "—"}</p></div>
          <div className="admin-card"><h3>Collection %</h3><p>{stats.collection_rate || "—"}</p></div>
          <div className="admin-card"><h3>Total Invoices</h3><p>{stats.total_invoices?.toString() || "—"}</p></div>
        </div>
      </section>
      <section className="admin-section">
        <h2 className="admin-section__title">Payment Methods</h2>
        <ul className="admin-list">{(stats.payment_methods || []).map(m => <li key={m.label}>{m.label}: {m.count}</li>)}</ul>
      </section>
      <section className="admin-section">
        <h2 className="admin-section__title">Revenue Trends (Last 6 months)</h2>
        <ul className="admin-list">{(stats.revenue_trends || []).map(t => <li key={t.month}>{t.month}: {t.revenue}L</li>)}</ul>
      </section>
    </div>
  );
}
