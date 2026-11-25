from pydantic import BaseModel
from typing import List, Optional


class Recommendation(BaseModel):
    title: str
    description: str
    potential_saving_kwh: Optional[float] = None
    priority: str = "medium"  # low | medium | high


class RecommendationsOut(BaseModel):
    recommendations: List[Recommendation]
    generated_at: str
    context_summary: str


class AnomalyOut(BaseModel):
    appliance_id: int
    appliance_name: str
    log_date: str
    kwh_consumed: float
    expected_kwh: float
    deviation_pct: float
    reason: str


class ReportOut(BaseModel):
    id: int
    year: int
    month: int
    total_kwh: float
    estimated_cost: float
    ai_summary: str
    breakdown: Optional[List[dict]]
    created_at: str
