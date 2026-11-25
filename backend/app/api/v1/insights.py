from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.core.database import get_db
from app.services.anomaly_detector import detect_anomalies, get_recent_anomalies
from app.services.granite_client import generate_recommendations
from app.services.consumption_engine import get_monthly_totals, get_top_consumers
from app.models.user_settings import UserSettings
from app.models.appliance import Appliance

router = APIRouter(prefix="/insights", tags=["insights"])


def _build_context(db: Session) -> dict:
    today = date.today()
    settings = db.query(UserSettings).first()
    month_kwh = get_monthly_totals(db, today.year, today.month)
    top = get_top_consumers(db, today.year, today.month)
    anomalies = get_recent_anomalies(db, days=7)
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


@router.get("/anomalies")
def list_anomalies(days: int = 30, db: Session = Depends(get_db)):
    return {"anomalies": get_recent_anomalies(db, days=days)}


@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    context = _build_context(db)
    text = generate_recommendations(context)
    return {"recommendations_text": text, "context": context}


@router.post("/analyze")
def run_analysis(db: Session = Depends(get_db)):
    anomalies = detect_anomalies(db)
    return {"message": f"Analysis complete. {len(anomalies)} anomalies detected.", "anomalies": anomalies}
