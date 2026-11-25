"""
Consumption Engine — calculates kWh and manages daily logs.
Formula: kWh = (wattage * hours * quantity) / 1000
"""
from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.appliance import Appliance
from app.models.consumption_log import ConsumptionLog


def calc_kwh(wattage: float, hours: float, quantity: int = 1) -> float:
    return round((wattage * hours * quantity) / 1000, 4)


def log_daily_consumption(db: Session, log_date: Optional[date] = None) -> List[ConsumptionLog]:
    """Auto-log consumption for all active appliances for the given date."""
    target_date = log_date or date.today()
    appliances = db.query(Appliance).filter(Appliance.is_active == True).all()
    created = []
    for app in appliances:
        existing = (
            db.query(ConsumptionLog)
            .filter(
                ConsumptionLog.appliance_id == app.id,
                ConsumptionLog.log_date == target_date,
            )
            .first()
        )
        if existing:
            continue
        kwh = calc_kwh(app.wattage, app.daily_hours, app.quantity)
        log = ConsumptionLog(
            appliance_id=app.id,
            log_date=target_date,
            hours_used=app.daily_hours,
            kwh_consumed=kwh,
        )
        db.add(log)
        created.append(log)
    db.commit()
    for log in created:
        db.refresh(log)
    return created


def get_daily_totals(db: Session, start: date, end: date) -> List[dict]:
    rows = (
        db.query(ConsumptionLog.log_date, func.sum(ConsumptionLog.kwh_consumed).label("total_kwh"))
        .filter(ConsumptionLog.log_date >= start, ConsumptionLog.log_date <= end)
        .group_by(ConsumptionLog.log_date)
        .order_by(ConsumptionLog.log_date)
        .all()
    )
    return [{"date": str(r.log_date), "total_kwh": round(r.total_kwh, 4)} for r in rows]


def get_monthly_totals(db: Session, year: int, month: int) -> float:
    result = (
        db.query(func.sum(ConsumptionLog.kwh_consumed))
        .filter(
            func.strftime("%Y", ConsumptionLog.log_date) == str(year),
            func.strftime("%m", ConsumptionLog.log_date) == f"{month:02d}",
        )
        .scalar()
    )
    return round(result or 0.0, 4)


def get_appliance_monthly_kwh(db: Session, appliance_id: int, year: int, month: int) -> float:
    result = (
        db.query(func.sum(ConsumptionLog.kwh_consumed))
        .filter(
            ConsumptionLog.appliance_id == appliance_id,
            func.strftime("%Y", ConsumptionLog.log_date) == str(year),
            func.strftime("%m", ConsumptionLog.log_date) == f"{month:02d}",
        )
        .scalar()
    )
    return round(result or 0.0, 4)


def get_top_consumers(db: Session, year: int, month: int, limit: int = 5) -> List[dict]:
    rows = (
        db.query(
            ConsumptionLog.appliance_id,
            Appliance.name,
            Appliance.category,
            func.sum(ConsumptionLog.kwh_consumed).label("total_kwh"),
        )
        .join(Appliance, Appliance.id == ConsumptionLog.appliance_id)
        .filter(
            func.strftime("%Y", ConsumptionLog.log_date) == str(year),
            func.strftime("%m", ConsumptionLog.log_date) == f"{month:02d}",
        )
        .group_by(ConsumptionLog.appliance_id)
        .order_by(func.sum(ConsumptionLog.kwh_consumed).desc())
        .limit(limit)
        .all()
    )
    return [
        {"appliance_id": r.appliance_id, "name": r.name, "category": r.category, "total_kwh": round(r.total_kwh, 4)}
        for r in rows
    ]
