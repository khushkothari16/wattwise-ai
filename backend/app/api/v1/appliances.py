from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.appliance import Appliance
from app.schemas.appliance import ApplianceCreate, ApplianceUpdate, ApplianceOut
from app.services.consumption_engine import calc_kwh
from datetime import date

router = APIRouter(prefix="/appliances", tags=["appliances"])

CATEGORIES = [
    "cooling", "heating", "lighting", "kitchen", "entertainment",
    "laundry", "office", "security", "other"
]


def _enrich(appliance: Appliance) -> ApplianceOut:
    daily = calc_kwh(appliance.wattage, appliance.daily_hours, appliance.quantity)
    out = ApplianceOut.model_validate(appliance)
    out.daily_kwh = daily
    out.monthly_kwh = round(daily * 30, 4)
    return out


@router.get("", response_model=List[ApplianceOut])
def list_appliances(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Appliance)
    if active_only:
        q = q.filter(Appliance.is_active == True)
    return [_enrich(a) for a in q.all()]


@router.get("/categories")
def get_categories():
    return {"categories": CATEGORIES}


@router.post("", response_model=ApplianceOut, status_code=201)
def create_appliance(payload: ApplianceCreate, db: Session = Depends(get_db)):
    appliance = Appliance(**payload.model_dump())
    db.add(appliance)
    db.commit()
    db.refresh(appliance)
    return _enrich(appliance)


@router.get("/{appliance_id}", response_model=ApplianceOut)
def get_appliance(appliance_id: int, db: Session = Depends(get_db)):
    appliance = db.query(Appliance).filter(Appliance.id == appliance_id).first()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    return _enrich(appliance)


@router.put("/{appliance_id}", response_model=ApplianceOut)
def update_appliance(appliance_id: int, payload: ApplianceUpdate, db: Session = Depends(get_db)):
    appliance = db.query(Appliance).filter(Appliance.id == appliance_id).first()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(appliance, field, value)
    appliance.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(appliance)
    return _enrich(appliance)


@router.delete("/{appliance_id}", status_code=204)
def delete_appliance(appliance_id: int, db: Session = Depends(get_db)):
    appliance = db.query(Appliance).filter(Appliance.id == appliance_id).first()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    db.delete(appliance)
    db.commit()
