from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.core.scheduler import start_scheduler
from app.api.v1 import api_router
from app.services.consumption_engine import log_daily_consumption
from app.core.database import SessionLocal
from datetime import date


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    # Seed default settings + log today if needed
    db = SessionLocal()
    try:
        from app.models.user_settings import UserSettings
        if not db.query(UserSettings).first():
            db.add(UserSettings())
            db.commit()
        log_daily_consumption(db)
    finally:
        db.close()
    start_scheduler(app)
    yield
    # Shutdown
    from app.core.scheduler import scheduler
    if scheduler.running:
        scheduler.shutdown()


app = FastAPI(
    title="WattWise AI API",
    description="IBM Granite-powered household electricity awareness platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "service": "WattWise AI"}


@app.get(
    "/orchestrate-skill.json",
    include_in_schema=False,
    summary="OpenAPI skill spec for watsonx Orchestrate import",
)
def orchestrate_skill_spec():
    """
    Returns an Orchestrate-ready OpenAPI 3.0 spec containing only the
    /api/v1/orchestrate/* endpoints. Upload this JSON to watsonx Orchestrate
    under Skills > Import > From OpenAPI file.
    """
    from fastapi.responses import JSONResponse
    from fastapi.openapi.utils import get_openapi
    import json

    full = get_openapi(
        title="WattWise AI — Energy Skills",
        version="1.0.0",
        description=(
            "WattWise AI energy skills for watsonx Orchestrate. "
            "Gives your Orchestrate agent the ability to query household electricity data, "
            "get bill estimates, detect anomalies, and ask IBM Granite for energy advice."
        ),
        routes=app.routes,
    )

    # Filter to only /api/v1/orchestrate/* paths
    filtered_paths = {
        path: methods
        for path, methods in full.get("paths", {}).items()
        if "/orchestrate/" in path
    }

    # Build a clean Orchestrate-compatible spec
    skill_spec = {
        "openapi": "3.0.3",
        "info": {
            "title": "WattWise AI — Energy Skills",
            "description": (
                "Household electricity management skills. Use these to query energy data, "
                "get bill projections, detect anomalies, and get AI-powered saving tips."
            ),
            "version": "1.0.0",
        },
        "servers": [{"url": "http://localhost:8000/api/v1"}],
        "paths": filtered_paths,
        "components": full.get("components", {}),
        "security": [{"ApiKeyAuth": []}],
        "securityDefinitions": {
            "ApiKeyAuth": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key",
            }
        },
    }

    # Inject security scheme into components
    skill_spec["components"].setdefault("securitySchemes", {})
    skill_spec["components"]["securitySchemes"]["ApiKeyAuth"] = {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key",
        "description": "WattWise Orchestrate API key (set ORCHESTRATE_API_KEY in backend .env)",
    }

    return JSONResponse(content=skill_spec)
