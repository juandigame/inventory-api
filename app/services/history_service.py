"""Business rules for movement history queries."""

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.movement import Movement
from app.repositories import history_repository, product_repository

# User-facing messages defined in the requirements document.
PRODUCT_NOT_FOUND = "El producto indicado no existe en el sistema"  # MSG-03


def list_product_movements(db: Session, product_id: int) -> list[Movement]:
    """Returns the movement history of a product, most recent first.

    Raises NotFoundError if the product does not exist. An empty list is valid
    when the product exists but has no recorded movements.
    """
    product = product_repository.get_by_id(db, product_id)
    if product is None:
        raise NotFoundError(PRODUCT_NOT_FOUND)
    return history_repository.list_by_product(db, product_id)


def list_movements(
    db: Session,
    product_id: int | None = None,
    movement_type: str | None = None,
) -> list[Movement]:
    """Returns the movement log, optionally filtered by product or type."""
    if product_id is not None:
        product = product_repository.get_by_id(db, product_id)
        if product is None:
            raise NotFoundError(PRODUCT_NOT_FOUND)
    return history_repository.list_all(db, product_id=product_id, movement_type=movement_type)

