export interface InvoiceStat {
  totalInvoices: number;
  amountProcessed: string;
  amountAtRisk: string;
  amountSaved: string;
  autoHold: number;
  manualReview: number;
  autoApproved: number;
  flaggedCount?: number;
}

export interface FlaggedInvoice {
  "Invoice No"?: string;
  "Vendor Name Clean"?: string;
  "Total Invoice (Rs.)"?: number | string;
  "PO Number"?: string;
  PREDICTED_ANOMALY: string;
  risk_score: number;
  risk_decision: string;
  reason?: string;
  [key: string]: any;
}

export interface PipelineResponse {
  stats: InvoiceStat;
  flaggedInvoices: FlaggedInvoice[];
  message?: string;
}
