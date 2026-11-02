"""Pydantic schemas for stock movements and movement history."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MovementType = Literal["ENTRY", "EXIT"]


class MovementCreate(BaseModel):
    """Data required to register a stock entry or exit."""

    model_config = ConfigDict(str_strip_whitespace=True)

    product_id: int = Field(gt=0)
    type: MovementType
    quantity: int
    note: str | None = Field(default=None, max_length=255)


class MovementResponse(BaseModel):
    """Movement record as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    type: MovementType
    quantity: int
    stock_before: int
    stock_after: int
    note: str | None
    created_at: datetime

