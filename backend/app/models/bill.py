from sqlalchemy import Column, Integer, Float, Text, DateTime
from datetime import datetime, timezone
from app.core.database import Base


class MonthlyBill(Base):
    __tablename__ = "monthly_bills"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    total_kwh = Column(Float, nullable=False, default=0.0)
    estimated_cost = Column(Float, nullable=False, default=0.0)
    tariff_rate = Column(Float, nullable=False, default=0.0)
    breakdown_json = Column(Text, nullable=True)   # JSON string
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
