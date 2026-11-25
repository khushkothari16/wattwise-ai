from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.user_settings import UserSettings
from app.schemas.settings import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_or_create(db: Session) -> UserSettings:
    settings = db.query(UserSettings).first()
    if not settings:
        settings = UserSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    settings = _get_or_create(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    settings.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(settings)
    return settings
