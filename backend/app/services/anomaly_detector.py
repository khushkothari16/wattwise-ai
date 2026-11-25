"""
Anomaly Detector — flags unusual consumption using z-score on 30-day rolling average.
"""
from datetime import date, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
import statistics

from app.models.consumption_log import ConsumptionLog
from app.models.appliance import Appliance
from app.models.user_settings import UserSettings


def detect_anomalies(db: Session, target_date: date = None) -> List[dict]:
    target_date = target_date or date.today()
    settings = db.query(UserSettings).first()
    threshold_pct = getattr(settings, "anomaly_threshold_pct", 20.0) if settings else 20.0

    appliances = db.query(Appliance).filter(Appliance.is_active == True).all()
    anomalies = []

    for app in appliances:
        window_start = target_date - timedelta(days=30)
        history = (
            db.query(ConsumptionLog.kwh_consumed)
            .filter(
                ConsumptionLog.appliance_id == app.id,
                ConsumptionLog.log_date >= window_start,
                ConsumptionLog.log_date < target_date,
            )
            .all()
        )
        values = [h.kwh_consumed for h in history]
        if len(values) < 3:
            continue

        mean = statistics.mean(values)
        stdev = statistics.stdev(values) if len(values) > 1 else 0

        today_log = (
            db.query(ConsumptionLog)
            .filter(
                ConsumptionLog.appliance_id == app.id,
                ConsumptionLog.log_date == target_date,
            )
            .first()
        )
        if not today_log:
            continue

        deviation_pct = ((today_log.kwh_consumed - mean) / mean * 100) if mean > 0 else 0

        if abs(deviation_pct) >= threshold_pct:
            direction = "higher" if deviation_pct > 0 else "lower"
            reason = (
                f"{app.name} used {abs(deviation_pct):.1f}% {direction} energy than "
                f"its 30-day average ({mean:.3f} kWh). Actual: {today_log.kwh_consumed:.3f} kWh."
            )
            today_log.is_anomaly = True
            today_log.anomaly_reason = reason
            anomalies.append({
                "appliance_id": app.id,
                "appliance_name": app.name,
                "log_date": str(target_date),
                "kwh_consumed": today_log.kwh_consumed,
                "expected_kwh": round(mean, 4),
                "deviation_pct": round(deviation_pct, 1),
                "reason": reason,
            })

    db.commit()
    return anomalies


def get_recent_anomalies(db: Session, days: int = 30) -> List[dict]:
    since = date.today() - timedelta(days=days)
    rows = (
        db.query(ConsumptionLog, Appliance.name)
        .join(Appliance, Appliance.id == ConsumptionLog.appliance_id)
        .filter(ConsumptionLog.is_anomaly == True, ConsumptionLog.log_date >= since)
        .order_by(ConsumptionLog.log_date.desc())
        .all()
    )
    return [
        {
            "appliance_id": log.appliance_id,
            "appliance_name": name,
            "log_date": str(log.log_date),
            "kwh_consumed": log.kwh_consumed,
            "reason": log.anomaly_reason,
        }
        for log, name in rows
    ]
