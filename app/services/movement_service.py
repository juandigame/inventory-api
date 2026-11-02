"""Business rules for stock movements. Owns the transaction (commit / rollback)."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, NotFoundError
from app.models.movement import Movement
from app.repositories import movement_repository, product_repository
from app.schemas.movement import MovementCreate

# User-facing messages defined in the requirements document.
PRODUCT_NOT_FOUND = "El producto indicado no existe en el sistema"  # MSG-03
INSUFFICIENT_STOCK = "Stock insuficiente para realizar la salida solicitada"  # MSG-05


def create_movement(db: Session, data: MovementCreate) -> Movement:
    """Registers an ENTRY or EXIT movement and updates product stock atomically."""
    product = product_repository.get_for_update(db, data.product_id)
    if product is None:
        db.rollback()
        raise NotFoundError(PRODUCT_NOT_FOUND)

    stock_before = product.current_stock
    if data.type == "ENTRY":
        stock_after = stock_before + data.quantity
    else:
        if data.quantity > stock_before:
            db.rollback()
            raise BusinessRuleError(INSUFFICIENT_STOCK)
        stock_after = stock_before - data.quantity

    try:
        product_repository.update_stock(db, product, stock_after)
        movement = movement_repository.create(
            db,
            Movement(
                product_id=product.id,
                type=data.type,
                quantity=data.quantity,
                stock_before=stock_before,
                stock_after=stock_after,
                note=data.note,
            ),
        )
        db.commit()
        db.refresh(movement)
    except IntegrityError:
        db.rollback()
        raise BusinessRuleError(INSUFFICIENT_STOCK)

    return movement

