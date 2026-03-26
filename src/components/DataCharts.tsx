import React, { useState } from "react";
import { getChartUrl } from "../services/api";
import { type InvoiceStat } from "../types";

interface DataChartsProps {
  stats: InvoiceStat;
}

const DataCharts: React.FC<DataChartsProps> = ({ stats }) => {
  // Use a timestamp to prevent browser cache from showing the old risk score chart
  const [timestamp] = useState(() => Date.now());

  // Parse financial amounts safely
  const amountProcessed = parseFloat(stats.amountProcessed.replace(/,/g, '')) || 0;
  const amountAtRisk = parseFloat(stats.amountAtRisk.replace(/,/g, '')) || 0;

  // Calculate percentages
  const total = amountProcessed || 1; // avoid division by zero
  const riskPercent = Math.min((amountAtRisk / total) * 100, 100).toFixed(1);
  const safePercent = Math.max(100 - parseFloat(riskPercent), 0).toFixed(1);

  return (
    <section className="charts-grid">
      <div className="chart-card">
        <h3>Risk Score Distribution</h3>
        <div className="chart-placeholder" style={{ padding: 0, overflow: 'hidden' }}>
          <img 
            src={`${getChartUrl("risk_score_distribution.png")}?t=${timestamp}`} 
            alt="Risk Score Distribution" 
            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              if (e.currentTarget.parentElement) {
                const p = e.currentTarget.parentElement.querySelector('p');
                if (p) p.removeAttribute('style');
              }
            }}
          />
          <p style={{ display: 'none' }}>Failed to load chart</p>
        </div>
      </div>
      <div className="chart-card">
        <h3>Financial Impact Analysis</h3>
        <div className="financial-chart-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '0.9rem' }}>Total Processed</p>
              <h2 style={{ margin: '0.2rem 0 0 0', color: '#ffffff' }}>₹ {stats.amountProcessed}</h2>
            </div>
          </div>

          <div style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.1)', height: '24px', borderRadius: '12px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${safePercent}%`, backgroundColor: '#2ecc71', height: '100%', transition: 'width 1s ease-in-out' }} title={`Safe: ${safePercent}%`} />
            <div style={{ width: `${riskPercent}%`, backgroundColor: '#e74c3c', height: '100%', transition: 'width 1s ease-in-out' }} title={`At Risk: ${riskPercent}%`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#a0aec0', marginTop: '-1rem' }}>
            <span>{safePercent}% Processed Safely</span>
            <span>{riskPercent}% At Risk</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', borderLeft: '4px solid #e74c3c' }}>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '0.85rem' }}>Amount At Risk</p>
              <h3 style={{ margin: '0.3rem 0 0 0', color: '#e74c3c' }}>₹ {stats.amountAtRisk}</h3>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '0.85rem' }}>Amount Saved</p>
              <h3 style={{ margin: '0.3rem 0 0 0', color: '#2ecc71' }}>₹ {stats.amountSaved}</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataCharts;
