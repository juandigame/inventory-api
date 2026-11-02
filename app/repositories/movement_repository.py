"""Database access for stock movements. Never commits: services own the transaction."""

from sqlalchemy.orm import Session

from app.models.movement import Movement


def create(db: Session, movement: Movement) -> Movement:
    """Adds a new movement and flushes it so it gets an id."""
    db.add(movement)
    db.flush()
    return movement

