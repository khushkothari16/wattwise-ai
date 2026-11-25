from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Appliance(Base):
    __tablename__ = "appliances"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, default="other")
    wattage = Column(Float, nullable=False)
    daily_hours = Column(Float, nullable=False, default=1.0)
    quantity = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
    room = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    consumption_logs = relationship(
        "ConsumptionLog", back_populates="appliance", cascade="all, delete-orphan"
    )
