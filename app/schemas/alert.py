"""Pydantic schemas for stock alerts."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    """A product whose current stock is at or below its minimum stock."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    current_stock: int
    minimum_stock: int
    created_at: datetime
    updated_at: datetime

