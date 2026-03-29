import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './HistoryModal.css';
import { API_BASE_URL } from '../services/api';

type UploadRecord = {
  id: number;
  filename: string;
  upload_status: string;
  processing_status: string;
  total_invoices?: number;
  risk_score_avg?: number;
  uploaded_at?: string;
  processed_at?: string;
  report_path?: string;
};

const HistoryModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE_URL}/uploads/history`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to load history');
        const json = await res.json();
        setHistory(json.history.uploads || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [open]);

  if (!open) return null;

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) {
      return '—';
    }
  };

  const modalContent = (
    <div className="history-backdrop" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h3>Upload History</h3>
          <button className="close-btn" onClick={onClose}>Close</button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{color: 'red'}}>{error}</p>
        ) : history.length === 0 ? (
          <p>No uploads found.</p>
        ) : (
          <div className="history-list">
            {history.map((h) => (
              <div key={h.id} className="history-item">
                <div className="meta">
                  <div className="filename">{h.filename}</div>
                  <div className="dates">Uploaded: {formatDate(h.uploaded_at)}</div>
                </div>
                <div className="stats">
                  <div>Invoices: {h.total_invoices ?? '—'}</div>
                  <div>Avg Risk: {h.risk_score_avg ?? '—'}</div>
                </div>
                <div className="actions">
                  {h.processing_status === 'completed' && (
                    <a
                      className="report-link"
                      href={`${API_BASE_URL}/reports/download?metadata_id=${h.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M12 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 21H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Download Report</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HistoryModal;
