from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class ConsumptionLogCreate(BaseModel):
    appliance_id: int
    log_date: date
    hours_used: float = Field(..., ge=0, le=24)


class ConsumptionLogOut(BaseModel):
    id: int
    appliance_id: int
    appliance_name: str = ""
    log_date: date
    hours_used: float
    kwh_consumed: float
    is_anomaly: bool
    anomaly_reason: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DailySummary(BaseModel):
    date: date
    total_kwh: float
    estimated_cost: float
    anomaly_count: int


class MonthlySummary(BaseModel):
    year: int
    month: int
    total_kwh: float
    estimated_cost: float
    days_logged: int


class DashboardSummary(BaseModel):
    today_kwh: float
    today_cost: float
    month_kwh: float
    month_cost: float
    month_budget: Optional[float]
    budget_used_pct: Optional[float]
    top_consumers: List[dict]
    active_appliances: int
    anomaly_count_this_month: int
