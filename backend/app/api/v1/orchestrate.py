"""
WattWise AI — watsonx Orchestrate Skill Router
================================================
This router exposes a clean, Orchestrate-compatible OpenAPI 3.0 surface.
Each endpoint has:
  - A descriptive operationId (becomes the skill name in Orchestrate)
  - A rich summary / description (shown in Orchestrate skill catalogue)
  - Minimal, flat request/response schemas (Orchestrate works best with flat objects)

Authentication: X-API-Key header (set ORCHESTRATE_API_KEY in .env)
"""
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.core.config import settings
from app.services.consumption_engine import (
    get_monthly_totals, get_top_consumers, get_daily_totals
)
from app.services.bill_estimator import estimate_current_month
from app.services.anomaly_detector import get_recent_anomalies, detect_anomalies
from app.services.granite_client import generate_recommendations, call_granite
from app.models.appliance import Appliance
from app.models.user_settings import UserSettings
from pydantic import BaseModel, Field

router = APIRouter(prefix="/orchestrate", tags=["watsonx Orchestrate Skills"])

# ── API Key Security ──────────────────────────────────────────────────────────
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(api_key: Optional[str] = Security(API_KEY_HEADER)):
    expected = getattr(settings, "orchestrate_api_key", "") or ""
    # If no key is configured, allow all (dev mode)
    if not expected:
        return
    if api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")


# ── Response Models ───────────────────────────────────────────────────────────

class EnergySnapshot(BaseModel):
    household_name: str = Field(..., description="Name of the household")
    active_appliances: int = Field(..., description="Number of active appliances tracked")
    today_kwh: float = Field(..., description="Total kWh consumed today across all appliances")
    today_cost_usd: float = Field(..., description="Estimated cost of today's consumption")
    month_kwh: float = Field(..., description="Total kWh consumed this month so far")
    month_cost_usd: float = Field(..., description="Estimated cost of this month's consumption so far")
    projected_month_kwh: float = Field(..., description="Projected total kWh for end of this month")
    projected_month_cost_usd: float = Field(..., description="Projected total bill for end of this month")
    currency: str = Field(..., description="Currency code for cost values (e.g. USD, INR)")
    top_consumer_name: str = Field(..., description="Name of the appliance using the most electricity this month")
    top_consumer_kwh: float = Field(..., description="kWh used by the top consumer this month")
    anomaly_count: int = Field(..., description="Number of unusual consumption events detected this month")


class ApplianceListItem(BaseModel):
    id: int
    name: str
    category: str
    wattage_watts: float
    daily_hours: float
    daily_kwh: float
    monthly_kwh: float
    room: Optional[str]
    is_active: bool


class ApplianceListResponse(BaseModel):
    total: int = Field(..., description="Total number of appliances")
    appliances: list[ApplianceListItem]


class BillEstimateResponse(BaseModel):
    year: int
    month: int
    days_elapsed: int
    days_in_month: int
    kwh_so_far: float = Field(..., description="kWh consumed from month start to today")
    projected_kwh: float = Field(..., description="Projected kWh for the full month based on daily average")
    projected_cost: float = Field(..., description="Projected electricity bill for the full month")
    tariff_rate: float = Field(..., description="Electricity tariff rate per kWh")
    currency: str
    budget: Optional[float] = Field(None, description="Monthly budget set by user, if any")
    budget_used_pct: Optional[float] = Field(None, description="Percentage of budget already used (projected)")
    status: str = Field(..., description="Budget status: on_track | warning | over_budget | no_budget")


class AnomalyItem(BaseModel):
    appliance_name: str
    log_date: str
    kwh_consumed: float
    reason: str


class AnomalyResponse(BaseModel):
    total_anomalies: int
    anomalies: list[AnomalyItem]


class RecommendationsResponse(BaseModel):
    recommendations: str = Field(..., description="AI-generated energy saving recommendations from IBM Granite")
    household_context_summary: str = Field(..., description="Summary of the household data used to generate tips")


class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's question or message about their energy usage")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="IBM Granite's response about the household energy situation")


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_context(db: Session) -> dict:
    today = date.today()
    s = db.query(UserSettings).first()
    tariff = s.tariff_rate if s else 0.12
    month_kwh = get_monthly_totals(db, today.year, today.month)
    top = get_top_consumers(db, today.year, today.month)
    anomalies = get_recent_anomalies(db, days=7)
    active = db.query(Appliance).filter(Appliance.is_active == True).count()
    return {
        "household_name": s.household_name if s else "My Home",
        "active_appliances": active,
        "month_kwh": month_kwh,
        "month_cost": round(month_kwh * tariff, 2),
        "currency": s.currency if s else "USD",
        "tariff_rate": tariff,
        "top_consumers": top,
        "anomalies": anomalies,
    }


# ── Skill Endpoints ───────────────────────────────────────────────────────────

@router.get(
    "/energy-snapshot",
    response_model=EnergySnapshot,
    operation_id="getEnergySnapshot",
    summary="Get household energy snapshot",
    description=(
        "Returns a complete real-time energy snapshot for the household. "
        "Includes today's consumption, this month's total and projected bill, "
        "the top energy-consuming appliance, and anomaly count. "
        "Use this as the first call to understand the household's current energy situation."
    ),
)
def get_energy_snapshot(
    _: None = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    today = date.today()
    s = db.query(UserSettings).first()
    tariff = s.tariff_rate if s else 0.12
    currency = s.currency if s else "USD"

    today_rows = get_daily_totals(db, today, today)
    today_kwh = today_rows[0]["total_kwh"] if today_rows else 0.0
    month_kwh = get_monthly_totals(db, today.year, today.month)
    top = get_top_consumers(db, today.year, today.month, limit=1)
    active = db.query(Appliance).filter(Appliance.is_active == True).count()

    from app.models.consumption_log import ConsumptionLog
    from sqlalchemy import func
    anomaly_count = (
        db.query(ConsumptionLog)
        .filter(
            ConsumptionLog.is_anomaly == True,
            func.strftime("%Y", ConsumptionLog.log_date) == str(today.year),
            func.strftime("%m", ConsumptionLog.log_date) == f"{today.month:02d}",
        )
        .count()
    )

    estimate = estimate_current_month(db)

    return EnergySnapshot(
        household_name=s.household_name if s else "My Home",
        active_appliances=active,
        today_kwh=today_kwh,
        today_cost_usd=round(today_kwh * tariff, 2),
        month_kwh=month_kwh,
        month_cost_usd=round(month_kwh * tariff, 2),
        projected_month_kwh=estimate.projected_kwh,
        projected_month_cost_usd=estimate.projected_cost,
        currency=currency,
        top_consumer_name=top[0]["name"] if top else "N/A",
        top_consumer_kwh=top[0]["total_kwh"] if top else 0.0,
        anomaly_count=anomaly_count,
    )


@router.get(
    "/appliances",
    response_model=ApplianceListResponse,
    operation_id="listAppliances",
    summary="List all household appliances",
    description=(
        "Returns all appliances registered in the household with their wattage, "
        "daily usage hours, and calculated daily/monthly kWh consumption. "
        "Use this to understand what appliances are in the home and their energy impact."
    ),
)
def list_appliances(
    active_only: bool = False,
    _: None = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    from app.services.consumption_engine import calc_kwh
    q = db.query(Appliance)
    if active_only:
        q = q.filter(Appliance.is_active == True)
    items = q.all()
    return ApplianceListResponse(
        total=len(items),
        appliances=[
            ApplianceListItem(
                id=a.id,
                name=a.name,
                category=a.category,
                wattage_watts=a.wattage,
                daily_hours=a.daily_hours,
                daily_kwh=calc_kwh(a.wattage, a.daily_hours, a.quantity),
                monthly_kwh=round(calc_kwh(a.wattage, a.daily_hours, a.quantity) * 30, 4),
                room=a.room,
                is_active=a.is_active,
            )
            for a in items
        ],
    )


@router.get(
    "/bill-estimate",
    response_model=BillEstimateResponse,
    operation_id="getBillEstimate",
    summary="Get current month electricity bill estimate",
    description=(
        "Returns the projected electricity bill for the current month based on consumption so far. "
        "Includes days elapsed, kWh consumed, projected end-of-month kWh and cost, "
        "and budget status. Use this to answer questions like 'What will my electricity bill be?'"
    ),
)
def get_bill_estimate(
    _: None = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    est = estimate_current_month(db)
    if est.budget and est.projected_cost:
        pct = est.budget_used_pct or 0
        status = "over_budget" if pct > 100 else "warning" if pct > 80 else "on_track"
    else:
        status = "no_budget"
    return BillEstimateResponse(
        **est.model_dump(),
        status=status,
    )


@router.get(
    "/anomalies",
    response_model=AnomalyResponse,
    operation_id="getEnergyAnomalies",
    summary="Get unusual energy consumption events",
    description=(
        "Returns a list of anomalous electricity consumption events detected in the past 30 days. "
        "Each anomaly includes which appliance behaved unusually, when it happened, "
        "how much it consumed, and a plain-English explanation. "
        "Use this to answer questions like 'What was unusual about my energy use recently?'"
    ),
)
def get_anomalies(
    days: int = 30,
    _: None = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    items = get_recent_anomalies(db, days=days)
    return AnomalyResponse(
        total_anomalies=len(items),
        anomalies=[
            AnomalyItem(
                appliance_name=a["appliance_name"],
                log_date=a["log_date"],
                kwh_consumed=a["kwh_consumed"],
                reason=a.get("reason", ""),
            )
            for a in items
        ],
    )


@router.get(
    "/recommendations",
    response_model=RecommendationsResponse,
    operation_id="getEnergySavingRecommendations",
    summary="Get AI-powered energy saving recommendations",
    description=(
        "Uses IBM Granite to generate personalized electricity-saving tips based on the household's "
        "actual appliance data, consumption patterns, and anomalies. "
        "Use this to answer questions like 'How can I lower my electricity bill?' or "
        "'What are some tips to save energy at home?'"
    ),
)
def get_recommendations(
    _: None = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    ctx = _get_context(db)
    text = generate_recommendations(ctx)
    summary = (
        f"{ctx['household_name']}: {ctx['active_appliances']} appliances, "
        f"{ctx['month_kwh']:.1f} kWh this month, "
        f"top consumer: {ctx['top_consumers'][0]['name'] if ctx['top_consumers'] else 'N/A'}"
    )
    return RecommendationsResponse(recommendations=text, household_context_summary=summary)


@router.post(
    "/chat",
    response_model=ChatResponse,
    operation_id="chatWithEnergyAdvisor",
    summary="Chat with WattWise AI energy advisor",
    description=(
        "Send a natural language message to the WattWise AI energy advisor powered by IBM Granite. "
        "The advisor has full context of the household's energy data and can answer questions, "
        "provide explanations, give tips, and interpret consumption patterns. "
        "Use this for any free-form energy question from the user."
    ),
)
def chat_with_advisor(
    payload: ChatRequest,
    _: None = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    ctx = _get_context(db)
    reply = call_granite(
        [{"role": "user", "content": payload.message}],
        household_context=ctx,
        max_tokens=600,
    )
    return ChatResponse(reply=reply)
