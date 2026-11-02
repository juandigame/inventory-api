"""Business rules for products. Owns the transaction (commit / rollback)."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, InvalidInputError, NotFoundError
from app.models.product import Product
from app.repositories import product_repository
from app.schemas.product import ProductCreate, ProductUpdate

# User-facing messages defined in the requirements document.
SKU_ALREADY_EXISTS = "El código SKU ya se encuentra registrado en el sistema"  # MSG-01
PRODUCT_NOT_FOUND = "El producto indicado no existe en el sistema"  # MSG-03
PRODUCT_HAS_MOVEMENTS = (
    "No se puede eliminar el producto porque tiene movimientos registrados en el historial"
)  # MSG-08


def list_products(db: Session) -> list[Product]:
    """Returns every product."""
    return product_repository.list_all(db)


def get_product(db: Session, product_id: int) -> Product:
    """Returns one product or raises NotFoundError."""
    product = product_repository.get_by_id(db, product_id)
    if product is None:
        raise NotFoundError(PRODUCT_NOT_FOUND)
    return product


def create_product(db: Session, data: ProductCreate) -> Product:
    """Creates a product with its initial stock. The SKU must be unique."""
    if product_repository.get_by_sku(db, data.sku) is not None:
        raise InvalidInputError(SKU_ALREADY_EXISTS)
    try:
        product = product_repository.create(db, Product(**data.model_dump()))
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise InvalidInputError(SKU_ALREADY_EXISTS)
    return product


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
    """Updates name, SKU and minimum stock. Never changes current_stock."""
    product = get_product(db, product_id)
    same_sku = product_repository.get_by_sku(db, data.sku)
    if same_sku is not None and same_sku.id != product.id:
        raise InvalidInputError(SKU_ALREADY_EXISTS)
    try:
        product_repository.update(db, product, data.name, data.sku, data.minimum_stock)
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise InvalidInputError(SKU_ALREADY_EXISTS)
    return product


def delete_product(db: Session, product_id: int) -> None:
    """Deletes a product. Products with movements cannot be deleted."""
    product = get_product(db, product_id)
    if product_repository.has_movements(db, product_id):
        raise BusinessRuleError(PRODUCT_HAS_MOVEMENTS)
    try:
        product_repository.delete(db, product)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise BusinessRuleError(PRODUCT_HAS_MOVEMENTS)

