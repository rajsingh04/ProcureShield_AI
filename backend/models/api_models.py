from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class InvoiceStat(BaseModel):
    totalInvoices: int
    amountProcessed: str
    amountAtRisk: str
    amountSaved: str
    autoHold: int
    manualReview: int
    autoApproved: int

class PipelineResponse(BaseModel):
    stats: InvoiceStat
    flaggedInvoices: List[Dict[str, Any]]
    message: Optional[str] = "Success"
