import React from 'react';

interface ModelAnomaliesProps {
  invoices: any[];
  stats?: any;
}

const KNOWN_LABELS: { key: string; aliases: string[] }[] = [
  { key: 'Duplicate', aliases: ['duplicate', 'duplicates'] },
  { key: 'Rate Mismatch', aliases: ['rate mismatch', 'rate_mismatch', 'rate-mismatch'] },
  { key: 'Ghost', aliases: ['ghost', 'ghost invoice'] },
  { key: '3-Way Match Fail', aliases: ['3-way', '3 way', '3-way match', '3-way match fail', '3 way match fail'] },
];

const detectLabel = (raw: string) => {
  if (!raw || typeof raw !== 'string') return 'Unknown';
  const s = raw.toLowerCase();
  for (const lbl of KNOWN_LABELS) {
    for (const a of lbl.aliases) if (s.includes(a)) return lbl.key;
  }
  if (s.includes('duplicate')) return 'Duplicate';
  if (s.includes('rate')) return 'Rate Mismatch';
  if (s.includes('ghost')) return 'Ghost';
  if (s.includes('3') && s.includes('way')) return '3-Way Match Fail';
  return 'Unknown';
};

const findTypeKey = (inv: any) => {
  if (!inv) return null;
  const keys = Object.keys(inv);
  const candidates = ['Anomaly Type', 'anomaly', 'type', 'Issue', 'reason', 'Reason', 'issue', 'Category', 'category', 'anomaly_type'];
  for (const c of candidates) if (keys.includes(c)) return c;
  for (const k of keys) if (/type|reason|issue|category|anomaly/i.test(k)) return k;
  return null;
};

const ModelAnomalies: React.FC<ModelAnomaliesProps> = ({ invoices, stats }) => {
  const totalInvoices = (() => {
    if (stats) {
      if (stats.totalInvoices) return Number(stats.totalInvoices);
      if (stats.total_invoices) return Number(stats.total_invoices);
    }
    return Math.max(invoices.length, 0);
  })();

  const typeKey = invoices && invoices.length ? findTypeKey(invoices[0]) : null;

  const counts: Record<string, number> = { 'Duplicate':0, 'Rate Mismatch':0, 'Ghost':0, '3-Way Match Fail':0 };
  let unknownCount = 0;
  invoices.forEach(inv => {
    let raw = null as any;
    if (typeKey) raw = inv[typeKey];
    if (!raw) {
      raw = inv['Anomaly'] ?? inv['anomaly'] ?? inv['Issue'] ?? inv['issue'] ?? inv['reason'] ?? inv['category'] ?? 'Unknown';
    }
    const label = detectLabel(typeof raw === 'string' ? raw : String(raw));
    if (label === 'Unknown') {
      unknownCount += 1;
    } else {
      counts[label] = (counts[label] || 0) + 1;
    }
  });

  const detectedTotal = Object.values(counts).reduce((s, v) => s + v, 0);
  // Unknown invoices are treated as Normal by default (they are not counted as detected anomalies)
  const normalCount = Math.max(totalInvoices - detectedTotal, 0);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🔎</span>
        <h4 style={{ margin: 0, color: '#e2e8f0' }}>Model Detected Anomalies</h4>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
          <div style={{ color: '#9fb0c8', fontSize: '.8rem', textTransform: 'uppercase' }}>Total Invoices</div>
          <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{totalInvoices}</div>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
          <div style={{ color: '#9fb0c8', fontSize: '.8rem', textTransform: 'uppercase' }}>Normal</div>
          <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{normalCount}</div>
        </div>

        {['Duplicate','Rate Mismatch','Ghost','3-Way Match Fail'].map((k) => (
          <div key={k} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ color: '#9fb0c8', fontSize: '.8rem', textTransform: 'uppercase' }}>{k}</div>
            <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{counts[k] ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelAnomalies;
