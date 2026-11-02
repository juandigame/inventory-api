"""Aggregates every router. Each component adds one line here."""

from fastapi import APIRouter

from app.api import alerts, health, history, movements, products

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(products.router)
api_router.include_router(movements.router)
api_router.include_router(history.router)
api_router.include_router(alerts.router)
