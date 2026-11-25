from fastapi import APIRouter
from app.api.v1 import appliances, consumption, bills, insights, chat, reports, settings, orchestrate

api_router = APIRouter()
api_router.include_router(appliances.router)
api_router.include_router(consumption.router)
api_router.include_router(bills.router)
api_router.include_router(insights.router)
api_router.include_router(chat.router)
api_router.include_router(reports.router)
api_router.include_router(settings.router)
api_router.include_router(orchestrate.router)
