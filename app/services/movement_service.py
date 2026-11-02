"""Business rules for stock movements. Owns the transaction (commit / rollback)."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, InvalidInputError, NotFoundError
from app.models.movement import Movement
from app.repositories import movement_repository, product_repository
from app.schemas.movement import MovementCreate

# User-facing messages defined in the requirements document (CU02 & CU03).
PRODUCT_NOT_FOUND = "El producto indicado no existe en el sistema"  # MSG-03
INVALID_ENTRY_QUANTITY = "La cantidad de entrada debe ser un número entero mayor a cero"  # MSG-04
INVALID_EXIT_QUANTITY = "La cantidad de salida debe ser un número entero mayor a cero"  # MSG-06


def insufficient_stock_message(available: int) -> str:
    """Builds MSG-05 including the current available stock."""
    return f"Stock insuficiente para realizar la salida. Stock disponible: {available}"  # MSG-05


def create_movement(db: Session, data: MovementCreate) -> Movement:
    """Registers an ENTRY or EXIT movement and updates product stock atomically."""
    if data.quantity <= 0:
        msg = INVALID_ENTRY_QUANTITY if data.type == "ENTRY" else INVALID_EXIT_QUANTITY
        raise InvalidInputError(msg)

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
            raise BusinessRuleError(insufficient_stock_message(stock_before))
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
        raise BusinessRuleError(insufficient_stock_message(stock_before))

    return movement

