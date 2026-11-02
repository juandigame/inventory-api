"""Database access for products. Never commits: services own the transaction."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.movement import Movement
from app.models.product import Product


def get_by_id(db: Session, product_id: int) -> Product | None:
    """Returns the product with the given id, or None."""
    return db.get(Product, product_id)


def get_by_sku(db: Session, sku: str) -> Product | None:
    """Returns the product with the given SKU, or None."""
    return db.scalar(select(Product).where(Product.sku == sku))


def list_all(db: Session) -> list[Product]:
    """Returns every product ordered by id."""
    return list(db.scalars(select(Product).order_by(Product.id.asc())).all())


def create(db: Session, product: Product) -> Product:
    """Adds a new product and flushes it so it gets an id."""
    db.add(product)
    db.flush()
    return product


def update(db: Session, product: Product, name: str, sku: str, minimum_stock: int) -> Product:
    """Updates the editable fields of a product. Never touches current_stock."""
    product.name = name
    product.sku = sku
    product.minimum_stock = minimum_stock
    db.flush()
    return product


def delete(db: Session, product: Product) -> None:
    """Deletes a product."""
    db.delete(product)
    db.flush()


def has_movements(db: Session, product_id: int) -> bool:
    """Returns True if the product has at least one movement."""
    statement = select(Movement.id).where(Movement.product_id == product_id).limit(1)
    return db.scalar(statement) is not None


def get_for_update(db: Session, product_id: int) -> Product | None:
    """Returns the product and locks its row until the transaction ends (SELECT ... FOR UPDATE)."""
    return db.scalar(select(Product).where(Product.id == product_id).with_for_update())


def update_stock(db: Session, product: Product, new_stock: int) -> Product:
    """Sets the current stock of a product. Only movements should call this."""
    product.current_stock = new_stock
    db.flush()
    return product

