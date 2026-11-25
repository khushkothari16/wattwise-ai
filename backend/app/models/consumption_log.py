from sqlalchemy import Column, Integer, Float, Boolean, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"

    id = Column(Integer, primary_key=True, index=True)
    appliance_id = Column(Integer, ForeignKey("appliances.id"), nullable=False, index=True)
    log_date = Column(Date, nullable=False, index=True)
    hours_used = Column(Float, nullable=False)
    kwh_consumed = Column(Float, nullable=False)
    is_anomaly = Column(Boolean, default=False)
    anomaly_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    appliance = relationship("Appliance", back_populates="consumption_logs")
