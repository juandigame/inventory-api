"""Database access for movement history."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.movement import Movement


def list_by_product(db: Session, product_id: int) -> list[Movement]:
    """Returns every movement of a product, most recent first."""
    statement = (
        select(Movement)
        .where(Movement.product_id == product_id)
        .order_by(Movement.created_at.desc(), Movement.id.desc())
    )
    return list(db.scalars(statement).all())


def list_all(
    db: Session,
    product_id: int | None = None,
    movement_type: str | None = None,
) -> list[Movement]:
    """Returns movements across the inventory, optionally filtered, most recent first."""
    statement = select(Movement)
    if product_id is not None:
        statement = statement.where(Movement.product_id == product_id)
    if movement_type is not None:
        statement = statement.where(Movement.type == movement_type)
    statement = statement.order_by(Movement.created_at.desc(), Movement.id.desc())
    return list(db.scalars(statement).all())

