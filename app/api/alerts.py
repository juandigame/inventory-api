"""Stock alert endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.alert import AlertResponse
from app.services import alert_service

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=list[AlertResponse])
def list_alerts(db: Session = Depends(get_db)) -> list[AlertResponse]:
    """Lists products that need restocking (current stock <= minimum stock)."""
    products = alert_service.list_alerts(db)
    return [AlertResponse.model_validate(product) for product in products]

