"""Pydantic schemas for products."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    """Data required to create a product, including its initial stock."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    sku: str = Field(min_length=1, max_length=50)
    current_stock: int = Field(ge=0)
    minimum_stock: int = Field(ge=0)


class ProductUpdate(BaseModel):
    """Data that can be updated. current_stock is excluded: it only changes through movements."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    sku: str = Field(min_length=1, max_length=50)
    minimum_stock: int = Field(ge=0)


class ProductResponse(BaseModel):
    """Product as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    current_stock: int
    minimum_stock: int
    created_at: datetime
    updated_at: datetime

