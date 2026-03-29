import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { type InvoiceStat } from "../types";
import "./DataCharts.css";

interface DataChartsProps {
  stats: InvoiceStat;
  flaggedInvoices?: any[];
}

const DataCharts: React.FC<DataChartsProps> = ({ stats, flaggedInvoices }) => {
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement>(null);
  const detectionChartRef = useRef<HTMLCanvasElement>(null);
  const histCanvasId = 'hist-canvas';
  const chartInstances = useRef<any>({});

  // Parse financial amounts safely
  const amountProcessed = parseFloat(String(stats.amountProcessed).replace(/,/g, '')) || 0;
  const amountAtRisk = parseFloat(String(stats.amountAtRisk).replace(/,/g, '')) || 0;
  const amountSaved = parseFloat(String(stats.amountSaved).replace(/,/g, '')) || 0;

  const formatAmountCompact = (v: number) => {
    if (v >= 1e7) return (v / 1e7).toFixed(2).replace(/\.00$/, '') + 'CR';
    if (v >= 1e5) return (v / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
    if (v >= 1e3) return (v / 1e3).toFixed(2).replace(/\.00$/, '') + 'K';
    return v.toLocaleString();
  };

  // Helper to compute recovery stats and raw counts so we can reuse in rendering
  const computeRecoveryStats = () => {
    const rows = flaggedInvoices || [];
    const amountCandidates = ['Amount at Risk (Rs.)', 'Amount at Risk', 'Total Invoice (Rs.)', 'Total Invoice'];

    const types = [
      { key: 'Duplicate', label: 'Duplicate' },
      { key: 'Rate Mismatch', label: 'Rate Mismatch' },
      { key: 'Ghost', label: 'Ghost Invoice' },
      { key: '3-Way Match Fail', label: '3-Way Fail' }
    ];

    const rawCounts: { total: number; detected: number; totalAmt: number; detectedAmt: number }[] = [];

    // initialize
    for (let i = 0; i < types.length; i++) rawCounts.push({ total: 0, detected: 0, totalAmt: 0, detectedAmt: 0 });

    const pickAmount = (r: any) => {
      for (const c of amountCandidates) {
        if (c in r && r[c] != null && String(r[c]).trim() !== '') return parseFloat(String(r[c]).replace(/,/g, '')) || 0;
        // try case-insensitive keys
        for (const k of Object.keys(r)) {
          if (k.toLowerCase() === c.toLowerCase() && r[k] != null && String(r[k]).trim() !== '') return parseFloat(String(r[k]).replace(/,/g, '')) || 0;
        }
      }
      return 0;
    };

    const classify = (raw: any) => {
      if (!raw && raw !== 0) return 'Unknown';
      const s = String(raw).toLowerCase();
      if (s.includes('duplicate')) return 'Duplicate';
      if (s.includes('rate')) return 'Rate Mismatch';
      if (s.includes('ghost')) return 'Ghost';
      if (s.includes('3') && s.includes('way')) return '3-Way Match Fail';
      return 'Unknown';
    };

    const getAny = (r: any, cands: string[]) => {
      for (const c of cands) {
        if (c in r && r[c] != null) return r[c];
        for (const k of Object.keys(r)) if (k.toLowerCase() === c.toLowerCase() && r[k] != null) return r[k];
      }
      return undefined;
    };

    for (const r of rows) {
      const amt = pickAmount(r);
      // find true label candidate
      const trueCandidates = ['TRUE_LABEL', 'True Label', 'Anomaly Type', 'TRUE', 'TRUE_LABEL', 'Anomaly'];
      const predCandidates = ['PREDICTED_ANOMALY', 'PREDICTED', 'ML_PREDICTION', 'prediction', 'PREDICTED_ANOMALY'];
      const trueRaw = getAny(r, trueCandidates);
      const predRaw = getAny(r, predCandidates);

      const trueLabel = classify(trueRaw);
      const predLabel = classify(predRaw);

      // increment totals
      const ti = types.findIndex(t => t.key === trueLabel);
      if (ti >= 0) {
        rawCounts[ti].total += 1;
        rawCounts[ti].totalAmt += amt;
      }

      const di = types.findIndex(t => t.key === predLabel);
      if (di >= 0) {
        rawCounts[di].detected += 1;
        rawCounts[di].detectedAmt += amt;
      }
    }

    const groundTruthExists = rows.some((r: any) => {
      const v = getAny(r, ['TRUE_LABEL', 'True Label', 'Anomaly Type', 'TRUE', 'Anomaly']);
      return v !== undefined && v !== null && String(v).trim() !== '' && String(v).toLowerCase() !== 'normal';
    });

    const dataVals: number[] = [];
    if (groundTruthExists) {
      for (const rc of rawCounts) {
        let pct = 0;
        if (rc.totalAmt > 0) pct = rc.detectedAmt / rc.totalAmt;
        else if (rc.total > 0) pct = rc.detected / rc.total;
        dataVals.push(Number((pct * 100).toFixed(1)));
      }
    } else {
      const totalPredAmt = rawCounts.reduce((s, r) => s + r.detectedAmt, 0);
      const totalPredCount = rawCounts.reduce((s, r) => s + r.detected, 0);
      for (const rc of rawCounts) {
        let pct = 0;
        if (totalPredAmt > 0) pct = rc.detectedAmt / totalPredAmt;
        else if (totalPredCount > 0) pct = rc.detected / totalPredCount;
        dataVals.push(Number((pct * 100).toFixed(1)));
      }
    }

    return { types, dataVals, rawCounts, groundTruthExists };
  };

  // Bar chart (financials)
  useEffect(() => {
    if (chartInstances.current.bar) chartInstances.current.bar.destroy();

    if (barChartRef.current) {
      const ctx = barChartRef.current.getContext('2d');
      if (!ctx) return;

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
          scales: {
            y: { beginAtZero: true,
              ticks: {
                callback: function(val: any) { return formatAmountCompact(Number(val)); }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  const v = context.parsed.y ?? context.parsed;
                  return `${context.dataset.label ? context.dataset.label + ': ' : ''}₹${formatAmountCompact(Number(v))}`;
                }
              }
            },
            legend: { display: false }
          }
        }
      });
    }

    return () => { if (chartInstances.current.bar) chartInstances.current.bar.destroy(); };
  }, [amountProcessed, amountAtRisk, amountSaved]);

  // Doughnut (safe vs risk)
  useEffect(() => {
    if (chartInstances.current.doughnut) chartInstances.current.doughnut.destroy();
    if (!doughnutChartRef.current) return;
    const ctx = doughnutChartRef.current.getContext('2d');
    if (!ctx) return;
    chartInstances.current.doughnut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Safe', 'Flagged/Risk'],
        datasets: [{ data: [amountSaved, amountAtRisk], backgroundColor: ['#2ecc71', '#e74c3c'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c: any) => {
        const v = c.raw || 0; if (v === 0) return `${c.label}: N/A`; return `${c.label}: ₹${formatAmountCompact(v)}`; } } } } }
    });
    return () => { if (chartInstances.current.doughnut) chartInstances.current.doughnut.destroy(); };
  }, [amountSaved, amountAtRisk]);

  // Histogram for risk scores
  useEffect(() => {
    if (chartInstances.current['hist']) chartInstances.current['hist'].destroy();
    const riskScores = (flaggedInvoices || []).map((inv: any) => parseFloat(inv.risk_score || inv.risk || 0)).filter((v: number) => !isNaN(v));
    if (riskScores.length === 0) return;

    const buckets = Array.from({ length: 10 }, (_, i) => ({ min: i*10, max: (i+1)*10, label: `${i*10}-${(i+1)*10}`, count: 0 }));
    riskScores.forEach(s => { const idx = Math.min(Math.floor(s/10), 9); buckets[idx].count += 1; });

    const histCanvas = document.getElementById(histCanvasId) as HTMLCanvasElement | null;
    if (!histCanvas) return;
    const ctx = histCanvas.getContext('2d');
    if (!ctx) return;
    chartInstances.current['hist'] = new Chart(ctx, {
      type: 'bar',
      data: { labels: buckets.map(b => b.label), datasets: [{ label: 'Risk Score Distribution', data: buckets.map(b => b.count), backgroundColor: 'rgba(91,124,250,0.7)' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    return () => { if (chartInstances.current['hist']) chartInstances.current['hist'].destroy(); };
  }, [flaggedInvoices]);

  // Detection percentages chart (replaces numeric cards)
  useEffect(() => {
    if (chartInstances.current['detection']) chartInstances.current['detection'].destroy();
    const recovery = computeRecoveryStats();
    const labels = recovery.types.map((t: any) => t.label);
    const data: number[] = recovery.dataVals || [];

    const colors = [
      'rgba(255,99,132,0.8)',
      'rgba(54,162,235,0.8)',
      'rgba(255,205,86,0.8)',
      'rgba(75,192,192,0.8)'
    ];

    const ctx = detectionChartRef.current?.getContext && detectionChartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstances.current['detection'] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Detection %', data, backgroundColor: colors.slice(0, labels.length) }] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => v + '%' } } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const idx = ctx.dataIndex;
                const label = ctx.label || '';
                const val = ctx.raw ?? 0;
                // include raw counts when available
                const rc = recovery.rawCounts && recovery.rawCounts[idx] ? recovery.rawCounts[idx] : null;
                const countStr = rc ? ` (${rc.detected || 0} detected)` : '';
                return `${label}: ${val}%${countStr}`;
              }
            }
          }
        }
      }
    });

    return () => { if (chartInstances.current['detection']) chartInstances.current['detection'].destroy(); };
  }, [flaggedInvoices, stats && stats.totalInvoices]);

  // No metric chart; percentages are computed and displayed in the UI below

  return (
    <section className="charts-grid">
      <div className="chart-card" style={{ minHeight: 260 }}>
        <h3>Risk Score Distribution</h3>
        <div className="chart-placeholder" style={{ padding: '1rem', height: '220px' }}>
          <canvas ref={barChartRef}></canvas>
        </div>
      </div>

      <div className="chart-card" style={{ minHeight: 260 }}>
        <h3>Financial Impact Analysis</h3>
        <div className="financial-chart-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', height: '220px' }}>
          <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <canvas ref={doughnutChartRef}></canvas>
            <div style={{ position: 'absolute', top: '40%', textAlign: 'center', pointerEvents: 'none' }}>
               <span style={{ display: 'block', fontSize: '0.8rem', color: '#8b97c6' }}>Total</span>
               <strong style={{ fontSize: '1.2rem', color: '#fff' }}>₹{formatAmountCompact(amountProcessed)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ minHeight: 260 }}>
        <h3>Risk Score Histogram</h3>
        <div style={{ padding: '1rem', height: '220px' }}>
          <canvas id={histCanvasId} style={{ width: '100%', height: '100%' }}></canvas>
        </div>
      </div>

      <div className="chart-card" style={{ minHeight: 260 }}>
        <h3>Detection Percentages</h3>
        <div style={{ padding: '1rem', height: '220px' }}>
          <canvas ref={detectionChartRef}></canvas>
        </div>
        <div style={{ padding: '0.5rem 1rem 1rem 1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* small legend with counts */}
          {(() => {
            const { types, rawCounts,  } = computeRecoveryStats() as any;
            if (!types) return null;
            return (
              <>
                {types.map((t: any, i: number) => {
                  const rc = rawCounts && rawCounts[i] ? rawCounts[i] : { detected: 0 };
                  return (
                    <div key={t.key} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#cfe3ff' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: ['rgba(255,99,132,0.8)','rgba(54,162,235,0.8)','rgba(255,205,86,0.8)','rgba(75,192,192,0.8)'][i] }}></div>
                      <div style={{ fontSize: '0.85rem' }}>{t.label} — {rc.detected || 0}</div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#cfe3ff' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(201,203,207,0.8)' }}></div>
                  <div style={{ fontSize: '0.85rem' }}>Normal — {Math.max(0, ((stats && stats.totalInvoices) || 0) - (computeRecoveryStats().rawCounts || []).reduce((s: number, r: any) => s + (r.detected || 0), 0))}</div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </section>
  );
};

export default DataCharts;
