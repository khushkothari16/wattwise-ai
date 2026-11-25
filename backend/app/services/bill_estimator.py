"""
Bill Estimator — calculates electricity costs from kWh consumption.
"""
import calendar
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session

from app.services.consumption_engine import get_monthly_totals, get_top_consumers
from app.models.user_settings import UserSettings
from app.models.bill import MonthlyBill
from app.schemas.bill import BillEstimate


def _get_settings(db: Session) -> UserSettings:
    settings = db.query(UserSettings).first()
    if not settings:
        settings = UserSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def estimate_current_month(db: Session) -> BillEstimate:
    today = date.today()
    year, month = today.year, today.month
    days_in_month = calendar.monthrange(year, month)[1]
    days_elapsed = today.day

    settings = _get_settings(db)
    kwh_so_far = get_monthly_totals(db, year, month)
    daily_avg = kwh_so_far / days_elapsed if days_elapsed > 0 else 0
    projected_kwh = round(daily_avg * days_in_month, 4)
    projected_cost = round(projected_kwh * settings.tariff_rate, 2)

    budget_used_pct = None
    if settings.monthly_budget and settings.monthly_budget > 0:
        current_cost = round(kwh_so_far * settings.tariff_rate, 2)
        budget_used_pct = round((current_cost / settings.monthly_budget) * 100, 1)

    return BillEstimate(
        year=year,
        month=month,
        days_elapsed=days_elapsed,
        days_in_month=days_in_month,
        kwh_so_far=kwh_so_far,
        projected_kwh=projected_kwh,
        projected_cost=projected_cost,
        tariff_rate=settings.tariff_rate,
        currency=settings.currency,
        budget=settings.monthly_budget,
        budget_used_pct=budget_used_pct,
    )


def finalize_monthly_bill(db: Session, year: int, month: int) -> MonthlyBill:
    import json
    settings = _get_settings(db)
    total_kwh = get_monthly_totals(db, year, month)
    estimated_cost = round(total_kwh * settings.tariff_rate, 2)
    top = get_top_consumers(db, year, month, limit=10)

    # Calculate breakdown percentages
    breakdown = []
    for item in top:
        pct = round((item["total_kwh"] / total_kwh * 100), 1) if total_kwh > 0 else 0
        breakdown.append({**item, "pct": pct})

    existing = db.query(MonthlyBill).filter(
        MonthlyBill.year == year, MonthlyBill.month == month
    ).first()

    if existing:
        existing.total_kwh = total_kwh
        existing.estimated_cost = estimated_cost
        existing.tariff_rate = settings.tariff_rate
        existing.breakdown_json = json.dumps(breakdown)
        db.commit()
        db.refresh(existing)
        return existing

    bill = MonthlyBill(
        year=year,
        month=month,
        total_kwh=total_kwh,
        estimated_cost=estimated_cost,
        tariff_rate=settings.tariff_rate,
        breakdown_json=json.dumps(breakdown),
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill
