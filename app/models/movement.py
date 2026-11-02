"""ORM model for the movements table (stock entries and exits)."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Movement(Base):
    """One stock entry or exit of a product. Rows are never edited or deleted."""

    __tablename__ = "movements"
    __table_args__ = (
        CheckConstraint("type IN ('ENTRY', 'EXIT')", name="ck_movements_type"),
        CheckConstraint("quantity > 0", name="ck_movements_quantity_positive"),
        CheckConstraint("stock_after >= 0", name="ck_movements_stock_after_non_negative"),
        Index("ix_movements_product_id_created_at", "product_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("products.id", ondelete="RESTRICT"),
    )
    type: Mapped[str] = mapped_column(String(10))
    quantity: Mapped[int]
    stock_before: Mapped[int]
    stock_after: Mapped[int]
    note: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
