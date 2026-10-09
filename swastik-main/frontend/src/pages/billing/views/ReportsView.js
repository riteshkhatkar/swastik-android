import React, { useState, useEffect } from "react";
import { api } from "../../../api/service";

const CHART_COLORS = ["#0f766e", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#64748b", "#94a3b8"];

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function ReportsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(null);

  const load = () => {
    setLoading(true);
    api.getBillingStats()
      .then((data) => {
        setStats(data);
        setGeneratedAt(new Date());
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !stats) {
    return (
      <div className="billing-content">
        <p className="billing-loading">Loading reports…</p>
      </div>
    );
  }

  const revenueTrends = stats?.revenue_trends ?? [];
  const maxRevenue = Math.max(1, ...revenueTrends.map((d) => Number(d.revenue) || 0));
  const statusBreakdown = stats?.status_breakdown ?? [];
  const paymentMethods = stats?.payment_methods ?? [];
  const totalBilled = Number(stats?.total_billed) || 0;
  const totalPaid = Number(stats?.total_paid) || 0;
  const outstanding = Number(stats?.outstanding) || 0;
  const collectionRate = stats?.collection_rate ?? "0%";
  const revenueToday = Number(stats?.revenue_today) || 0;
  const revenueMtd = Number(stats?.revenue_mtd) || 0;

  return (
    <div className="billing-content">
      <div className="billing-card__toolbar billing-card__toolbar--row" style={{ marginBottom: "8px" }}>
        <h2 className="billing-reports-page-title">Billing Reports</h2>
        <div className="billing-reports-toolbar">
          <span className="billing-reports-generated">
            {generatedAt ? `Generated ${generatedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}
          </span>
          <button type="button" className="billing-btn billing-btn--secondary billing-btn--sm" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      <p className="billing-card__subtitle" style={{ marginBottom: "24px" }}>
        Revenue, status and payment-method breakdown from the live database.
      </p>

      {/* Summary KPI cards */}
      <div className="billing-reports-kpis">
        <div className="billing-reports-kpi">
          <span className="billing-reports-kpi__value">{formatMoney(revenueToday)}</span>
          <span className="billing-reports-kpi__label">Revenue today</span>
        </div>
        <div className="billing-reports-kpi">
          <span className="billing-reports-kpi__value">{formatMoney(revenueMtd)}</span>
          <span className="billing-reports-kpi__label">Revenue (MTD)</span>
        </div>
        <div className="billing-reports-kpi">
          <span className="billing-reports-kpi__value">{formatMoney(totalPaid)}</span>
          <span className="billing-reports-kpi__label">Total collected</span>
        </div>
        <div className="billing-reports-kpi billing-reports-kpi--outstanding">
          <span className="billing-reports-kpi__value">{formatMoney(outstanding)}</span>
          <span className="billing-reports-kpi__label">Outstanding</span>
        </div>
        <div className="billing-reports-kpi">
          <span className="billing-reports-kpi__value">{collectionRate}</span>
          <span className="billing-reports-kpi__label">Collection rate</span>
        </div>
      </div>

      <div className="billing-card">
        <h2 className="billing-card__heading">Revenue trend (₹ Lakhs)</h2>
        <div className="reports-chart reports-chart--bars">
          {revenueTrends.length === 0 ? (
            <p className="billing-reports-empty">No revenue data yet. Data from live database.</p>
          ) : (
            revenueTrends.map((d, i) => (
              <div key={d.month} className="reports-chart__bar-wrap">
                <div
                  className="reports-chart__bar"
                  style={{
                    height: `${(Number(d.revenue) || 0) / maxRevenue * 100}%`,
                    background: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                  title={`${d.month}: ₹${d.revenue} L`}
                />
                <span className="reports-chart__label">{d.month}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="reports-row">
        <div className="billing-card">
          <h2 className="billing-card__heading">Invoice status</h2>
          <div className="reports-chart reports-chart--donut">
            {statusBreakdown.length === 0 ? (
              <p className="billing-reports-empty-small">No data</p>
            ) : (
              statusBreakdown.map((d, i) => (
                <div key={d.label} className="reports-chart__legend-item">
                  <span className="reports-chart__dot" style={{ background: d.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span><strong>{d.label}</strong>: {d.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="billing-card">
          <h2 className="billing-card__heading">Payment methods</h2>
          <div className="reports-chart reports-chart--donut">
            {paymentMethods.length === 0 ? (
              <p className="billing-reports-empty-small">No payments yet</p>
            ) : (
              paymentMethods.map((d, i) => (
                <div key={d.label} className="reports-chart__legend-item">
                  <span className="reports-chart__dot" style={{ background: d.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span><strong>{d.label}</strong>: {d.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsView;
