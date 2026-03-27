import React, { useState, useMemo } from "react";
import type { FlaggedInvoice } from "../types";
import "./InvoiceTable.css";

interface InvoiceTableProps {
  invoices: FlaggedInvoice[];
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<FlaggedInvoice | null>(null);

  // Filters
  const [filterInvoiceNo, setFilterInvoiceNo] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterAnomaly, setFilterAnomaly] = useState("");
  const [filterDecision, setFilterDecision] = useState("");

  const closePanel = () => setSelectedInvoice(null);

  // Filter Logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invNo = String(inv["Invoice No"] || "").toLowerCase();
      const vendor = String(inv["Vendor Name Clean"] || inv["Vendor Name"] || "").toLowerCase();
      const anomaly = String(inv.PREDICTED_ANOMALY || "").toLowerCase();
      const decision = String(inv.risk_decision || "").toLowerCase();

      return (
        invNo.includes(filterInvoiceNo.toLowerCase()) &&
        vendor.includes(filterVendor.toLowerCase()) &&
        (filterAnomaly === "" || anomaly === filterAnomaly.toLowerCase()) &&
        (filterDecision === "" || decision === filterDecision.toLowerCase())
      );
    });
  }, [invoices, filterInvoiceNo, filterVendor, filterAnomaly, filterDecision]);

  return (
    <>
      <section className="table-section">
        <div className="table-header">
          <h3>Invoice Register Data</h3>
          <span className="badge" style={{ padding: "0.4rem 0.8rem", backgroundColor: "rgba(255, 255, 255, 0.1)", color: "#fff", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>
            {filteredInvoices.length} / {invoices.length} Records
          </span>
        </div>

        {/* Filters */}
        <div className="table-filters">
          <input
            type="text"
            className="filter-input"
            placeholder="Filter Invoice No..."
            value={filterInvoiceNo}
            onChange={(e) => setFilterInvoiceNo(e.target.value)}
          />
          <input
            type="text"
            className="filter-input"
            placeholder="Filter Vendor..."
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterAnomaly}
            onChange={(e) => setFilterAnomaly(e.target.value)}
          >
            <option value="">All Anomalies</option>
            <option value="normal">NORMAL</option>
            <option value="duplicate_invoice">DUPLICATE_INVOICE</option>
            <option value="rate_mismatch">RATE_MISMATCH</option>
            <option value="ghost_invoice">GHOST_INVOICE</option>
            <option value="3way_match_fail">3WAY_MATCH_FAIL</option>
          </select>
          <select
            className="filter-select"
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
          >
            <option value="">All Decisions</option>
            <option value="auto approve">AUTO APPROVE</option>
            <option value="manual review">MANUAL REVIEW</option>
            <option value="auto hold">AUTO HOLD</option>
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Vendor</th>
                <th>Amount (₹)</th>
                <th>Predicted Anomaly</th>
                <th>Risk Score</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv, idx) => (
                <tr key={idx} onClick={() => setSelectedInvoice(inv)} className="invoice-row">
                  <td>
                    <strong>{inv["Invoice No"] || "N/A"}</strong>
                  </td>
                  <td>{inv["Vendor Name Clean"] || inv["Vendor Name"] || "N/A"}</td>
                  <td>{inv["Total Invoice (Rs.)"] || 0}</td>
                  <td>
                    <span className={`anomaly-badge type_${(inv.PREDICTED_ANOMALY || "").replace(/\s+/g, "_").toLowerCase()}`}>
                      {inv.PREDICTED_ANOMALY}
                    </span>
                  </td>
                  <td>
                    <div className="score-bar-container">
                      <div
                        className="score-bar"
                        style={{
                          width: `${inv.risk_score}%`,
                          backgroundColor:
                            inv.risk_score >= 70 ? "#e74c3c" : (inv.risk_score >= 40 ? "#f39c12" : "#2ecc71"),
                        }}
                      ></div>
                      <span>{inv.risk_score}/100</span>
                    </div>
                  </td>
                  <td>
                    <span className={`decision-badge ${inv.risk_decision === "AUTO HOLD" ? "hold" : (inv.risk_decision === "MANUAL REVIEW" ? "review" : "approve")}`}>
                      {inv.risk_decision}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    No invoices match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sliding Detail Panel */}
      <div className={`detail-overlay ${selectedInvoice ? "show" : ""}`} onClick={closePanel}>
        <div className="side-panel" onClick={(e) => e.stopPropagation()}>
          <div className="panel-header">
            <h2>Invoice Details</h2>
            <button className="close-btn" onClick={closePanel}>×</button>
          </div>
          <div className="panel-content">
            {selectedInvoice && (
              <>
                <div className="panel-section">
                  <h3>General Info</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-lbl">Invoice No</div>
                      <div className="detail-val">{selectedInvoice["Invoice No"] || "N/A"}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-lbl">Amount</div>
                      <div className="detail-val" style={{ color: "#f59e0b" }}>₹ {selectedInvoice["Total Invoice (Rs.)"]}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-lbl">Vendor name</div>
                      <div className="detail-val">{selectedInvoice["Vendor Name Clean"] || selectedInvoice["Vendor Name"] || "N/A"}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-lbl">PO Number</div>
                      <div className="detail-val">{selectedInvoice["PO Number"] || "N/A"}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-lbl">Invoice Date</div>
                      <div className="detail-val">{selectedInvoice["Invoice Date"] || selectedInvoice["Date"] || "N/A"}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-lbl">Department</div>
                      <div className="detail-val">{selectedInvoice["Department"] || "N/A"}</div>
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  <h3>Risk Assessment</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-lbl">Risk Score</div>
                      <div className="detail-val" style={{ color: selectedInvoice.risk_score >= 70 ? "#f43f5e" : (selectedInvoice.risk_score >= 40 ? "#f59e0b" : "#10b981") }}>
                        {selectedInvoice.risk_score} / 100
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-lbl">Decision</div>
                      <div className="detail-val">{selectedInvoice.risk_decision}</div>
                    </div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                      <div className="detail-lbl">Anomaly Type</div>
                      <div className="detail-val">{selectedInvoice.PREDICTED_ANOMALY}</div>
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  <h3>All Column Data</h3>
                  <div className="detail-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "0.6rem 1.5rem" }}>
                    {Object.entries(selectedInvoice)
                      .filter(([k]) => !['PREDICTED_ANOMALY', 'risk_score', 'risk_decision', 'reason', 'Invoice No', 'Total Invoice (Rs.)', 'Vendor Name Clean', 'dup_score', 'rate_score', 'ghost_score', 'match_score', 'TRUE_LABEL', 'ML_PREDICTION', 'Amount at Risk (Rs.)'].includes(k))
                      .map(([key, value]) => (
                        <div className="detail-item" key={key}>
                          <div className="detail-lbl">{key}</div>
                          <div className="detail-val" style={{ wordBreak: 'break-word', fontSize: '0.85rem' }}>{value !== null && value !== undefined && value !== "" ? String(value) : "N/A"}</div>
                        </div>
                    ))}
                  </div>
                </div>
                
                {selectedInvoice.PREDICTED_ANOMALY !== "NORMAL" && (
                  <div className="panel-section">
                    <h3>Explanation</h3>
                    <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#8b97c6' }}>
                      {selectedInvoice.reason || "This invoice has been flagged by the AI model due to high similarities with historical anomalies or unusual billing patterns."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceTable;
