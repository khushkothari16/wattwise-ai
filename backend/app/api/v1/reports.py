from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import date, datetime, timezone

from app.core.database import get_db
from app.models.bill import MonthlyBill
from app.schemas.insights import ReportOut
from app.services.bill_estimator import finalize_monthly_bill
from app.services.granite_client import generate_monthly_report
from app.services.consumption_engine import get_monthly_totals, get_top_consumers
from app.services.anomaly_detector import get_recent_anomalies
from app.models.user_settings import UserSettings
from app.models.appliance import Appliance

router = APIRouter(prefix="/reports", tags=["reports"])


def _build_context(db: Session, year: int, month: int) -> dict:
    settings = db.query(UserSettings).first()
    month_kwh = get_monthly_totals(db, year, month)
    top = get_top_consumers(db, year, month)
    anomalies = get_recent_anomalies(db, days=31)
    active = db.query(Appliance).filter(Appliance.is_active == True).count()
    tariff = settings.tariff_rate if settings else 0.12
    return {
        "household_name": settings.household_name if settings else "My Home",
        "active_appliances": active,
        "month_kwh": month_kwh,
        "month_cost": round(month_kwh * tariff, 2),
        "currency": settings.currency if settings else "USD",
        "tariff_rate": tariff,
        "top_consumers": top,
        "anomalies": anomalies,
    }


def _bill_to_report(bill: MonthlyBill) -> ReportOut:
    return ReportOut(
        id=bill.id,
        year=bill.year,
        month=bill.month,
        total_kwh=bill.total_kwh,
        estimated_cost=bill.estimated_cost,
        ai_summary=bill.ai_summary or "",
        breakdown=json.loads(bill.breakdown_json) if bill.breakdown_json else None,
        created_at=bill.created_at.isoformat(),
    )


@router.get("", response_model=List[ReportOut])
def list_reports(db: Session = Depends(get_db)):
    bills = (
        db.query(MonthlyBill)
        .filter(MonthlyBill.ai_summary != None)
        .order_by(MonthlyBill.year.desc(), MonthlyBill.month.desc())
        .all()
    )
    return [_bill_to_report(b) for b in bills]


@router.post("/generate")
def generate_report(year: int = None, month: int = None, db: Session = Depends(get_db)):
    today = date.today()
    year = year or today.year
    month = month or today.month

    bill = finalize_monthly_bill(db, year, month)
    context = _build_context(db, year, month)
    summary = generate_monthly_report(context, year, month)

    bill.ai_summary = summary
    db.commit()
    db.refresh(bill)
    return _bill_to_report(bill)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    bill = db.query(MonthlyBill).filter(MonthlyBill.id == report_id).first()
    if not bill:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    return _bill_to_report(bill)
