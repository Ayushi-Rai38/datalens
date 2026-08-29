from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.dataset import DatasetStatus


class DatasetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    status: DatasetStatus
    validation_error: str | None
    row_count: int | None
    column_count: int | None
    created_at: datetime
    updated_at: datetime


class DatasetListResponse(BaseModel):
    items: list[DatasetRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class DatasetColumnRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    position: int
    detected_type: str
    missing_count: int
    missing_percentage: float
    unique_count: int
    is_constant: bool
    extra_stats: dict[str, Any] = {}


class DatasetPreviewResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    previewed_rows: int
