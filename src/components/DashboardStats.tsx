import React from "react";
import type { InvoiceStat } from "../types";

interface DashboardStatsProps {
  stats: InvoiceStat;
}

const formatCurrency = (amountStr: string) => {
  // Remove existing commas to parse as number
  const num = parseFloat(amountStr.replace(/,/g, ''));
  if (isNaN(num)) return amountStr;

  if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + ' Cr';
  } else if (num >= 100000) {
    return (num / 100000).toFixed(2) + ' L';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + ' K';
  }
  return num.toString();
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <section className="stats-grid">
      <div className="stat-card">
        <h3>Total Invoices</h3>
        <div className="value">{stats.totalInvoices}</div>
        <div className="sub-value success">₹ {formatCurrency(stats.amountProcessed)} Processed</div>
      </div>
      <div className="stat-card">
        <h3>Amount at Risk</h3>
        <div className="value warning">₹ {formatCurrency(stats.amountAtRisk)}</div>
        <div className="sub-value">Flagged by model</div>
      </div>
      <div className="stat-card">
        <h3>Recovered (Saved)</h3>
        <div className="value success">₹ {formatCurrency(stats.amountSaved)}</div>
        <div className="sub-value">Prevented loss</div>
      </div>
      <div className="stat-card">
        <h3>Action Required</h3>
        <div className="value danger">{stats.autoHold}</div>
        <div className="sub-value danger">Invoices on Auto Hold</div>
      </div>
    </section>
  );
};

export default DashboardStats;
