from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ApplianceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(default="other", max_length=50)
    wattage: float = Field(..., gt=0)
    daily_hours: float = Field(default=1.0, ge=0, le=24)
    quantity: int = Field(default=1, ge=1)
    is_active: bool = True
    room: Optional[str] = Field(default=None, max_length=50)


class ApplianceCreate(ApplianceBase):
    pass


class ApplianceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    category: Optional[str] = Field(default=None, max_length=50)
    wattage: Optional[float] = Field(default=None, gt=0)
    daily_hours: Optional[float] = Field(default=None, ge=0, le=24)
    quantity: Optional[int] = Field(default=None, ge=1)
    is_active: Optional[bool] = None
    room: Optional[str] = Field(default=None, max_length=50)


class ApplianceOut(ApplianceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    daily_kwh: float = 0.0
    monthly_kwh: float = 0.0

    model_config = {"from_attributes": True}
