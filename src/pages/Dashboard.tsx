import React from "react";
import "./Dashboard.css";
import DashboardStats from "../components/DashboardStats";
import DataCharts from "../components/DataCharts";
import InvoiceTable from "../components/InvoiceTable";
import DatasetSummary from "../components/DatasetSummary";
import { getDownloadReportUrl } from "../services/api";

interface DashboardProps {
  onBack: () => void;
  data?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ onBack, data }) => {
  // Use real data passed from parent if available, fallback safely
  const responseData = data?.data || data; // Handle nested { data: {...} } vs { stats: {...} }
  const stats = responseData?.stats;
  const flaggedInvoices = responseData?.flaggedInvoices || [];
  
  // Extract dataset summary from flagged invoices if it exists
  const summaryRow = flaggedInvoices.find((inv: any) => inv["Invoice No"] && (inv["Invoice No"].toString().includes("DATASET SUMMARY") || inv["Invoice No"].toString().includes("Find:")));
  const validInvoices = flaggedInvoices.filter((inv: any) => !inv["Invoice No"] || !(inv["Invoice No"].toString().includes("DATASET SUMMARY") || inv["Invoice No"].toString().includes("Find:")));

  const handleExport = () => {
    window.open(getDownloadReportUrl(), "_blank");
  };

  return (
    <div className="dashboard-container">
      <header className="home-header">
        <div className="logo" onClick={onBack} style={{ cursor: "pointer" }}>
          <span className="logo-icon">🛡️</span>
          <h1>ProcureShield AI</h1>
        </div>
        <button className="export-button" onClick={handleExport}>⬇ Export Report</button>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h2>Analysis Results</h2>
          <p>Model execution complete. Showing insights for the uploaded Dataset.</p>
        </div>

        {stats ? (
          <>
            <DashboardStats stats={stats} />
            <DataCharts stats={stats} />
            
            {summaryRow && (
              <DatasetSummary summaryString={summaryRow["Invoice No"]} />
            )}

            <InvoiceTable invoices={validInvoices} />
          </>
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
