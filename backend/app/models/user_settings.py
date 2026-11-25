from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from app.core.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, default=1)
    household_name = Column(String(100), nullable=False, default="My Home")
    tariff_rate = Column(Float, nullable=False, default=0.12)       # $ per kWh
    currency = Column(String(10), nullable=False, default="USD")
    timezone = Column(String(50), nullable=False, default="UTC")
    monthly_budget = Column(Float, nullable=True)
    anomaly_threshold_pct = Column(Float, nullable=False, default=20.0)
    report_day = Column(Integer, nullable=False, default=1)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
