"""Database access for stock alerts."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product


def list_low_stock(db: Session) -> list[Product]:
    """Returns products whose current stock is at or below their minimum, lowest stock first."""
    statement = (
        select(Product)
        .where(Product.current_stock <= Product.minimum_stock)
        .order_by(Product.current_stock.asc(), Product.id.asc())
    )
    return list(db.scalars(statement).all())

