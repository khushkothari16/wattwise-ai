from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from app.core.database import get_db
from app.models.bill import MonthlyBill
from app.schemas.bill import BillOut, BillEstimate
from app.services.bill_estimator import estimate_current_month, finalize_monthly_bill

router = APIRouter(prefix="/bills", tags=["bills"])


def _bill_to_out(bill: MonthlyBill) -> BillOut:
    breakdown = json.loads(bill.breakdown_json) if bill.breakdown_json else None
    return BillOut(
        id=bill.id,
        year=bill.year,
        month=bill.month,
        total_kwh=bill.total_kwh,
        estimated_cost=bill.estimated_cost,
        tariff_rate=bill.tariff_rate,
        breakdown=breakdown,
        ai_summary=bill.ai_summary,
        created_at=bill.created_at,
    )


@router.get("", response_model=List[BillOut])
def list_bills(db: Session = Depends(get_db)):
    bills = db.query(MonthlyBill).order_by(MonthlyBill.year.desc(), MonthlyBill.month.desc()).all()
    return [_bill_to_out(b) for b in bills]


@router.get("/estimate", response_model=BillEstimate)
def get_current_estimate(db: Session = Depends(get_db)):
    return estimate_current_month(db)


@router.get("/{year}/{month}", response_model=BillOut)
def get_bill(year: int, month: int, db: Session = Depends(get_db)):
    bill = db.query(MonthlyBill).filter(
        MonthlyBill.year == year, MonthlyBill.month == month
    ).first()
    if not bill:
        # Compute on-the-fly
        bill = finalize_monthly_bill(db, year, month)
    return _bill_to_out(bill)
