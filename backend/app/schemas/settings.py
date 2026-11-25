from pydantic import BaseModel, Field
from typing import Optional


class SettingsOut(BaseModel):
    id: int
    household_name: str
    tariff_rate: float
    currency: str
    timezone: str
    monthly_budget: Optional[float]
    anomaly_threshold_pct: float
    report_day: int

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    household_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    tariff_rate: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = Field(default=None, max_length=10)
    timezone: Optional[str] = Field(default=None, max_length=50)
    monthly_budget: Optional[float] = Field(default=None, ge=0)
    anomaly_threshold_pct: Optional[float] = Field(default=None, ge=1, le=200)
    report_day: Optional[int] = Field(default=None, ge=1, le=28)
