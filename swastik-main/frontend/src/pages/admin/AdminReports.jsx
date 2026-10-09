import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { API_BASE_URL, getAuthHeader } from "../../api/config";
import "./AdminPages.css";

const REPORT_TYPES = [
  { name: "Daily hospital report", slug: "daily-hospital" },
  { name: "Lab performance report", slug: "lab-performance" },
  { name: "Financial report", slug: "financial" },
  { name: "Doctor performance report", slug: "doctor-performance" },
  { name: "Patient statistics", slug: "patient-statistics" },
  { name: "Medication monitoring trends", slug: "medication-monitoring" },
];

export default function AdminReports() {
  const [toast, setToast] = useState(null);
  const [loadingSlug, setLoadingSlug] = useState(null);

  const handleDownload = async (item) => {
    const { name, slug } = item;
    setLoadingSlug(slug);
    setToast("Fetching real-time data for " + name + "…");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/reports/download?report_type=${encodeURIComponent(slug)}`,
        { headers: { ...getAuthHeader(), "Content-Type": "application/json" } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.detail || data.message || "Failed to load report data.");
        setTimeout(() => setToast(null), 4000);
        return;
      }
      setToast("Generating PDF…");
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Swastik Hospital", 14, 16);
      doc.setFontSize(14);
      doc.text(data.title || name, 14, 24);
      doc.setFontSize(10);
      doc.text("Generated: " + (data.generated_at || new Date().toISOString()), 14, 30);
      let y = 38;
      const tables = data.tables || [];
      for (let t = 0; t < tables.length; t++) {
        const { headers = [], rows = [] } = tables[t];
        if (y > 260) { doc.addPage(); y = 20; }
        doc.autoTable({
          startY: y,
          head: [headers],
          body: rows,
          theme: "grid",
          headStyles: { fillColor: [13, 148, 136] },
        });
        y = doc.lastAutoTable.finalY + 12;
      }
      const safeName = (data.title || name).replace(/[^a-z0-9-_]/gi, "_");
      doc.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      setToast("Downloaded: " + name);
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setToast(err?.message || "Network error. Ensure backend is running.");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoadingSlug(null);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Reports & Analytics</h1>
      <p className="admin-page__subtitle">Generate and download reports as PDF (real-time data).</p>
      <section className="admin-section">
        <h2 className="admin-section__title">Available Reports</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {REPORT_TYPES.map(function (item, i) {
            const busy = loadingSlug === item.slug;
            return (
              <div key={i} className="admin-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{item.name}</span>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm"
                  onClick={() => handleDownload(item)}
                  disabled={busy}
                >
                  {busy ? "Generating…" : "Download PDF"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      {toast && <div className="admin-toast">{toast}</div>}
    </div>
  );
}
