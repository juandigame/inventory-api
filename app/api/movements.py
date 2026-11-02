"""Stock movement endpoints (entries and exits)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.movement import MovementCreate, MovementResponse
from app.services import movement_service

router = APIRouter(tags=["movements"])


@router.post("/movements", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
def create_movement(data: MovementCreate, db: Session = Depends(get_db)) -> MovementResponse:
    """Registers a stock entry (ENTRY) or exit (EXIT) and updates product stock."""
    movement = movement_service.create_movement(db, data)
    return MovementResponse.model_validate(movement)

