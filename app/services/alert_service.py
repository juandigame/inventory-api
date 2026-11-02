"""Business rules for stock alerts."""

from sqlalchemy.orm import Session

from app.models.product import Product
from app.repositories import alert_repository


def list_alerts(db: Session) -> list[Product]:
    """Returns the products that need restocking. An empty list is a valid result."""
    return alert_repository.list_low_stock(db)

