from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BillOut(BaseModel):
    id: int
    year: int
    month: int
    total_kwh: float
    estimated_cost: float
    tariff_rate: float
    breakdown: Optional[List[dict]] = None
    ai_summary: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class BillEstimate(BaseModel):
    year: int
    month: int
    days_elapsed: int
    days_in_month: int
    kwh_so_far: float
    projected_kwh: float
    projected_cost: float
    tariff_rate: float
    currency: str
    budget: Optional[float]
    budget_used_pct: Optional[float]
