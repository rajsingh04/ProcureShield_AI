import React from "react";

interface DatasetSummaryProps {
  summaryString: string;
}

const DatasetSummary: React.FC<DatasetSummaryProps> = ({ summaryString }) => {
  // Parse the summary string
  // Examples: 
  // "DATASET SUMMARY: Total Invoices: 500 | Normal: 345 | Duplicate: 19 | Rate Mismatch: 52 | Ghost: 24 | 3-Way Match Fail: 41"
  // "Find: 38 Duplicates | 52 Rate Mismatches | 24 Ghost Invoices | 41 3-Way Match Failures"
  
  const text = summaryString.replace("DATASET SUMMARY:", "").replace("Find:", "").trim();
  const parts = text.split("|").map(s => s.trim()).filter(Boolean);

  const parsedItems = parts.map(part => {
    // Check if it has a colon e.g. "Total Invoices: 500"
    if (part.includes(":")) {
      const [label, value] = part.split(":");
      return { label: label.trim(), value: value.trim() };
    }
    // Otherwise it might be like "38 Duplicates"
    const match = part.match(/^([\d,]+)\s+(.*)$/);
    if (match) {
      return { label: match[2].trim(), value: match[1].trim() };
    }
    return { label: part, value: "-" };
  });

  // Optionally recompute "Normal" from the other counts so that
  // duplicates are only subtracted once:
  // Normal = Total Invoices - (Duplicate + Rate Mismatch + Ghost + 3-Way Match Fail)
  const labelToValue: Record<string, number> = {};
  parsedItems.forEach(({ label, value }) => {
    const num = parseInt(value.toString().replace(/,/g, ""), 10);
    if (!isNaN(num)) {
      labelToValue[label.toLowerCase()] = num;
    }
  });

  const total = labelToValue["total invoices"];
  const dup = labelToValue["duplicate"] ?? labelToValue["duplicates"];
  const rate = labelToValue["rate mismatch"];
  const ghost = labelToValue["ghost"];
  const threeWay = labelToValue["3-way match fail"];

  let computedNormal: number | undefined;
  if ([total, dup, rate, ghost, threeWay].every(v => typeof v === "number")) {
    computedNormal = total - (dup + rate + ghost + threeWay);
  }

  return (
    <div style={{
      backgroundColor: "rgba(255, 255, 255, 0.03)",
      padding: "1.5rem",
      borderRadius: "12px",
      border: "1px solid rgba(255, 255, 255, 0.05)",
      marginBottom: "2.5rem"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <span style={{ fontSize: "1.5rem" }}>📊</span>
        <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "1.2rem", fontWeight: "600" }}>Dataset Ground Truth / Expected Anomalies</h3>
      </div>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
        gap: "1.5rem" 
      }}>
        {parsedItems.map((item, idx) => (
          <div key={idx} style={{
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center"
          }}>
            <span style={{ color: "#a0aec0", fontSize: "0.85rem", fontWeight: "500", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {item.label}
            </span>
            <span style={{ color: "#ffffff", fontSize: "1.75rem", fontWeight: "bold" }}>
              {item.label.toLowerCase() === "normal" && typeof computedNormal === "number"
                ? computedNormal
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatasetSummary;
