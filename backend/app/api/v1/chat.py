from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.chat_session import ChatSession
from app.schemas.chat import ChatRequest, ChatResponse, ChatSessionOut, ChatMessage
from app.services.granite_client import call_granite
from app.services.consumption_engine import get_monthly_totals, get_top_consumers
from app.services.anomaly_detector import get_recent_anomalies
from app.models.user_settings import UserSettings
from app.models.appliance import Appliance
from datetime import date

router = APIRouter(prefix="/chat", tags=["chat"])


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


def _session_to_out(session: ChatSession) -> ChatSessionOut:
    messages = json.loads(session.messages_json or "[]")
    return ChatSessionOut(
        id=session.id,
        title=session.title,
        messages=[ChatMessage(**m) for m in messages],
        created_at=session.created_at,
        updated_at=session.updated_at or session.created_at,
    )


@router.get("/sessions", response_model=List[ChatSessionOut])
def list_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).limit(20).all()
    return [_session_to_out(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=ChatSessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_to_out(session)


@router.post("/message", response_model=ChatResponse)
def send_message(payload: ChatRequest, db: Session = Depends(get_db)):
    now_str = datetime.now(timezone.utc).isoformat()

    if payload.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == payload.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        messages = json.loads(session.messages_json or "[]")
    else:
        session = ChatSession()
        db.add(session)
        db.flush()
        messages = []

    messages.append({"role": "user", "content": payload.message, "timestamp": now_str})

    # Build Granite messages (last 10 to stay within context window)
    granite_msgs = [{"role": m["role"], "content": m["content"]} for m in messages[-10:]]
    context = _build_context(db)
    reply = call_granite(granite_msgs, household_context=context)

    reply_ts = datetime.now(timezone.utc).isoformat()
    messages.append({"role": "assistant", "content": reply, "timestamp": reply_ts})

    # Update session title from first user message
    if session.title == "New conversation" and len(messages) <= 2:
        session.title = payload.message[:80]

    session.messages_json = json.dumps(messages)
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    return ChatResponse(
        session_id=session.id,
        reply=reply,
        messages=[ChatMessage(**m) for m in messages],
    )


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
