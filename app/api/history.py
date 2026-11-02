"""Movement history endpoints (per-product history and general log)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.movement import MovementResponse, MovementType
from app.services import history_service

router = APIRouter(tags=["history"])


@router.get("/products/{product_id}/movements", response_model=list[MovementResponse])
def list_product_movements(
    product_id: int, db: Session = Depends(get_db)
) -> list[MovementResponse]:
    """Lists every movement of a product, ordered from most recent to oldest."""
    movements = history_service.list_product_movements(db, product_id)
    return [MovementResponse.model_validate(movement) for movement in movements]


@router.get("/movements", response_model=list[MovementResponse])
def list_movements(
    product_id: int | None = Query(default=None, gt=0),
    type: MovementType | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MovementResponse]:
    """Lists the movement log (bitácora), with optional product_id and type filters."""
    movements = history_service.list_movements(db, product_id=product_id, movement_type=type)
    return [MovementResponse.model_validate(movement) for movement in movements]

