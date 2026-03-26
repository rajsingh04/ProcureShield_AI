import React from "react";
import FileUploader from "../components/FileUploader";
import "./Home.css";

interface HomeProps {
  onAnalyzeSuccess: (data: any) => void;
}

const Home: React.FC<HomeProps> = ({ onAnalyzeSuccess }) => {
  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo">
          <span className="logo-icon">🛡️</span>
          <h1>ProcureShield AI</h1>
        </div>
      </header>

      <main className="home-main">
        <section className="hero-section">
          <h2>Intelligent Procurement Defense</h2>
          <p>
            Upload your master dataset containing POs, GRNs, Rate Cards, and
            Invoices. Our Random Forest models will automatically detect rate
            mismatches, ghost invoices, and 3-way match failures.
          </p>
          <FileUploader onAnalyzeSuccess={onAnalyzeSuccess} />
        </section>
      </main>

      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
    </div>
  );
};

export default Home;
