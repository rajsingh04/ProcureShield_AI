import React from "react";
import type { FlaggedInvoice } from "../types";

interface InvoiceTableProps {
  invoices: FlaggedInvoice[];
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices }) => {
  return (
    <section className="table-section">
      <div className="table-header">
        <h3>High Risk Flagged Invoices</h3>
        <span className="badge warning" style={{ padding: "0.4rem 0.8rem", backgroundColor: "rgba(243, 156, 18, 0.2)", color: "#f39c12", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>
          {invoices.length} Flagged
        </span>
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
            {invoices.map((inv, idx) => (
              <tr key={idx}>
                <td>
                  <strong>{inv["Invoice No"] || "N/A"}</strong>
                </td>
                <td>{inv["Vendor Name Clean"] || "N/A"}</td>
                <td>{inv["Total Invoice (Rs.)"] || 0}</td>
                <td>
                  <span className={`anomaly-badge ${inv.PREDICTED_ANOMALY.replace(/\s+/g, "-").toLowerCase()}`}>
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
                          inv.risk_score >= 70 ? "#e74c3c" : "#f39c12",
                      }}
                    ></div>
                    <span>{inv.risk_score}/100</span>
                  </div>
                </td>
                <td>
                  <span className={`decision-badge ${inv.risk_decision === "AUTO HOLD" ? "hold" : "review"}`}>
                    {inv.risk_decision}
                  </span>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                  No anomalies flagged in this dataset.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default InvoiceTable;
