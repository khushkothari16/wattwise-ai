from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timezone

from app.core.database import get_db
from app.models.consumption_log import ConsumptionLog
from app.models.appliance import Appliance
from app.models.user_settings import UserSettings
from app.schemas.consumption import (
    ConsumptionLogCreate, ConsumptionLogOut, DailySummary,
    MonthlySummary, DashboardSummary
)
from app.services.consumption_engine import (
    calc_kwh, log_daily_consumption, get_daily_totals,
    get_monthly_totals, get_top_consumers
)
from app.services.anomaly_detector import get_recent_anomalies
from sqlalchemy import func

router = APIRouter(prefix="/consumption", tags=["consumption"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    today = date.today()
    settings = db.query(UserSettings).first()
    tariff = settings.tariff_rate if settings else 0.12
    currency = settings.currency if settings else "USD"
    budget = settings.monthly_budget if settings else None

    today_kwh = get_monthly_totals(db, today.year, today.month)  # reuse for today
    today_rows = get_daily_totals(db, today, today)
    today_kwh_actual = today_rows[0]["total_kwh"] if today_rows else 0.0

    month_kwh = get_monthly_totals(db, today.year, today.month)
    month_cost = round(month_kwh * tariff, 2)
    today_cost = round(today_kwh_actual * tariff, 2)

    budget_pct = None
    if budget and budget > 0:
        budget_pct = round(month_cost / budget * 100, 1)

    top = get_top_consumers(db, today.year, today.month)
    active_count = db.query(Appliance).filter(Appliance.is_active == True).count()

    anomaly_count = (
        db.query(ConsumptionLog)
        .filter(
            ConsumptionLog.is_anomaly == True,
            func.strftime("%Y", ConsumptionLog.log_date) == str(today.year),
            func.strftime("%m", ConsumptionLog.log_date) == f"{today.month:02d}",
        )
        .count()
    )

    return DashboardSummary(
        today_kwh=today_kwh_actual,
        today_cost=today_cost,
        month_kwh=month_kwh,
        month_cost=month_cost,
        month_budget=budget,
        budget_used_pct=budget_pct,
        top_consumers=top,
        active_appliances=active_count,
        anomaly_count_this_month=anomaly_count,
    )


@router.get("/daily")
def get_daily_consumption(
    start: date = None, end: date = None, db: Session = Depends(get_db)
):
    today = date.today()
    start = start or date(today.year, today.month, 1)
    end = end or today
    rows = get_daily_totals(db, start, end)
    settings = db.query(UserSettings).first()
    tariff = settings.tariff_rate if settings else 0.12
    for r in rows:
        r["estimated_cost"] = round(r["total_kwh"] * tariff, 2)
    return {"data": rows}


@router.get("/monthly")
def get_monthly_consumption(year: int = None, db: Session = Depends(get_db)):
    today = date.today()
    year = year or today.year
    results = []
    for m in range(1, 13):
        kwh = get_monthly_totals(db, year, m)
        if kwh > 0:
            settings = db.query(UserSettings).first()
            tariff = settings.tariff_rate if settings else 0.12
            results.append({"year": year, "month": m, "total_kwh": kwh, "estimated_cost": round(kwh * tariff, 2)})
    return {"data": results}


@router.post("/log", response_model=ConsumptionLogOut, status_code=201)
def manual_log(payload: ConsumptionLogCreate, db: Session = Depends(get_db)):
    appliance = db.query(Appliance).filter(Appliance.id == payload.appliance_id).first()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    kwh = calc_kwh(appliance.wattage, payload.hours_used)
    existing = db.query(ConsumptionLog).filter(
        ConsumptionLog.appliance_id == payload.appliance_id,
        ConsumptionLog.log_date == payload.log_date,
    ).first()
    if existing:
        existing.hours_used = payload.hours_used
        existing.kwh_consumed = kwh
        db.commit()
        db.refresh(existing)
        log = existing
    else:
        log = ConsumptionLog(
            appliance_id=payload.appliance_id,
            log_date=payload.log_date,
            hours_used=payload.hours_used,
            kwh_consumed=kwh,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
    out = ConsumptionLogOut.model_validate(log)
    out.appliance_name = appliance.name
    return out


@router.get("/appliance/{appliance_id}")
def get_appliance_history(appliance_id: int, days: int = 30, db: Session = Depends(get_db)):
    since = date.today().replace(day=1)
    logs = (
        db.query(ConsumptionLog)
        .filter(ConsumptionLog.appliance_id == appliance_id)
        .order_by(ConsumptionLog.log_date.desc())
        .limit(days)
        .all()
    )
    return {"data": [
        {"date": str(l.log_date), "kwh": l.kwh_consumed, "hours": l.hours_used, "is_anomaly": l.is_anomaly}
        for l in logs
    ]}


@router.post("/recalculate")
def recalculate(target_date: date = None, db: Session = Depends(get_db)):
    logs = log_daily_consumption(db, target_date)
    return {"message": f"Logged {len(logs)} consumption entries", "date": str(target_date or date.today())}
