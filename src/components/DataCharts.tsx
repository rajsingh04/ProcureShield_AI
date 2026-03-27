import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { type InvoiceStat } from "../types";

interface DataChartsProps {
  stats: InvoiceStat;
}

const DataCharts: React.FC<DataChartsProps> = ({ stats }) => {
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<{ bar?: Chart, doughnut?: Chart }>({});

  // Parse financial amounts safely
  const amountProcessed = parseFloat(stats.amountProcessed.replace(/,/g, '')) || 0;
  const amountAtRisk = parseFloat(stats.amountAtRisk.replace(/,/g, '')) || 0;
  const amountSaved = parseFloat(stats.amountSaved.replace(/,/g, '')) || 0;

  useEffect(() => {
    // Cleanup previous charts
    if (chartInstances.current.bar) chartInstances.current.bar.destroy();
    if (chartInstances.current.doughnut) chartInstances.current.doughnut.destroy();

    // Bar Chart
    if (barChartRef.current) {
      const ctx = barChartRef.current.getContext('2d');
      if (ctx) {
        chartInstances.current.bar = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Total Processed', 'Amount Safe', 'Amount At Risk'],
            datasets: [{
              label: 'Financial Distribution (₹)',
              data: [amountProcessed, amountSaved, amountAtRisk],
              backgroundColor: [
                'rgba(91, 124, 250, 0.7)',
                'rgba(46, 204, 113, 0.7)',
                'rgba(231, 76, 60, 0.7)'
              ],
              borderColor: [
                'rgba(91, 124, 250, 1)',
                'rgba(46, 204, 113, 1)',
                'rgba(231, 76, 60, 1)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      }
    }

    // Doughnut Chart
    if (doughnutChartRef.current) {
      const ctx = doughnutChartRef.current.getContext('2d');
      if (ctx) {
        chartInstances.current.doughnut = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Safe', 'Flagged/Risk'],
            datasets: [{
              data: [amountSaved, amountAtRisk],
              backgroundColor: [
                '#2ecc71',
                '#e74c3c'
              ],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
              legend: { position: 'bottom', labels: { color: '#dde3f5' } }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstances.current.bar) chartInstances.current.bar.destroy();
      if (chartInstances.current.doughnut) chartInstances.current.doughnut.destroy();
    };
  }, [amountProcessed, amountAtRisk, amountSaved]);

  return (
    <section className="charts-grid">
      <div className="chart-card">
        <h3>Risk Score Distribution</h3>
        <div className="chart-placeholder" style={{ padding: '1rem', height: '250px' }}>
          <canvas ref={barChartRef}></canvas>
        </div>
      </div>
      <div className="chart-card">
        <h3>Financial Impact Analysis</h3>
        <div className="financial-chart-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
          <div style={{ position: 'relative', height: '200px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <canvas ref={doughnutChartRef}></canvas>
            <div style={{ position: 'absolute', top: '40%', textAlign: 'center', pointerEvents: 'none' }}>
               <span style={{ display: 'block', fontSize: '0.8rem', color: '#8b97c6' }}>Total</span>
               <strong style={{ fontSize: '1.2rem', color: '#fff' }}>₹{stats.amountProcessed}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataCharts;
