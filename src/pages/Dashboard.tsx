import React from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./Dashboard.css";
import DashboardStats from "../components/DashboardStats";
import DataCharts from "../components/DataCharts";
import ModelAnomalies from "../components/ModelAnomalies";
import InvoiceTable from "../components/InvoiceTable";
import DatasetSummary from "../components/DatasetSummary";
import { getDownloadReportUrl } from "../services/api";

interface DashboardProps {
  onBack: () => void;
  data?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ onBack, data }) => {
  const responseData = data?.data || data;
  const stats = responseData?.stats;
  const flaggedInvoices = responseData?.flaggedInvoices || [];
  // Ensure stats contains a flaggedCount (count invoices with anomalies if backend didn't set it)
  const computeFlaggedCount = () => {
    if (
      stats &&
      typeof stats.flaggedCount === "number" &&
      stats.flaggedCount > 0
    )
      return stats.flaggedCount;
    if (!flaggedInvoices || !Array.isArray(flaggedInvoices)) return 0;
    return flaggedInvoices.filter((inv: any) => {
      const pred = (inv.PREDICTED_ANOMALY || inv.PREDICTED || inv.anomaly || "")
        .toString()
        .toUpperCase();
      const decision = (inv.risk_decision || inv.decision || "")
        .toString()
        .toUpperCase();
      // flagged if predicted anomaly is not NORMAL or decision is not AUTO APPROVE
      if (pred && pred !== "NORMAL") return true;
      if (decision && decision !== "AUTO APPROVE") return true;
      return false;
    }).length;
  };

  const statsWithFlagged = stats
    ? { ...stats, flaggedCount: computeFlaggedCount() }
    : stats;

  const summaryRow = flaggedInvoices.find(
    (inv: any) =>
      inv["Invoice No"] &&
      (inv["Invoice No"].toString().includes("DATASET SUMMARY") ||
        inv["Invoice No"].toString().includes("Find:")),
  );
  const validInvoices = flaggedInvoices.filter(
    (inv: any) =>
      !inv["Invoice No"] ||
      !(
        inv["Invoice No"].toString().includes("DATASET SUMMARY") ||
        inv["Invoice No"].toString().includes("Find:")
      ),
  );

  const handleExport = () => {
    const metadataId =
      data?.metadata_id || data?.data?.metadata_id || responseData?.metadata_id;
    if (metadataId) {
      window.open(
        `${getDownloadReportUrl()}?metadata_id=${metadataId}`,
        "_blank",
      );
    } else {
      // Friendly fallback when no processed report is available
      // (user can download from History or after running an analysis)
      alert(
        "No report available to export. Please run an analysis or download from History.",
      );
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div
          className="nav-logo"
          onClick={onBack}
          style={{ cursor: "pointer" }}
        >
          🛡️
        </div>
        <div
          className="nav-brand"
          onClick={onBack}
          style={{ cursor: "pointer" }}
        >
          ProcureShield <span>AI</span>
        </div>
        <div className="nav-tabs">
          <NavLink
            to="/dashboard/overview"
            className={({ isActive }) => `nav-tab ${isActive ? "active" : ""}`}
          >
            Overview
          </NavLink>
          <NavLink
            to="/dashboard/invoices"
            className={({ isActive }) => `nav-tab ${isActive ? "active" : ""}`}
          >
            Invoices
          </NavLink>
        </div>
        <div className="nav-right">
          <span className="live-dot"></span>
          <span className="nav-pill">LIVE SYSTEM</span>
          <button
            className="export-button"
            onClick={handleExport}
            style={{
              marginLeft: "1rem",
              padding: "0.4rem 0.8rem",
              fontSize: "0.75rem",
            }}
          >
            ⬇ Export
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        {stats ? (
          <Routes>
            <Route path="/" element={<Navigate to="overview" replace />} />
            <Route
              path="overview"
              element={
                <div className="page active">
                  <div className="sec-hdr">
                    <div className="sec-title">Executive Overview</div>
                    <div className="sec-tag">AI ANALYSIS READY</div>
                  </div>
                  {summaryRow && (
                    <DatasetSummary summaryString={summaryRow["Invoice No"]} />
                  )}
                  {/* Model anomalies panel (counts from model) */}
                  <ModelAnomalies
                    invoices={flaggedInvoices}
                    stats={statsWithFlagged}
                  />
                  <DashboardStats stats={statsWithFlagged} />
                  <DataCharts
                    stats={statsWithFlagged}
                    flaggedInvoices={flaggedInvoices}
                  />
                </div>
              }
            />
            <Route
              path="invoices"
              element={
                <div className="page active">
                  <div className="sec-hdr">
                    <div className="sec-title">Invoice Register</div>
                    <div className="sec-tag">ANOMALIES DETECTED</div>
                  </div>
                  <InvoiceTable invoices={validInvoices} />
                </div>
              }
            />
          </Routes>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p>Error loading analysis data. Please try again.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
