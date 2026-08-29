from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class QualityIssue(BaseModel):
    code: str
    message: str
    severity: str
    penalty: float


class QualityReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dataset_id: int
    quality_score: float
    profiling_result: dict[str, Any]
    quality_issues: list[QualityIssue]
    numerical_stats: dict[str, Any]
    categorical_stats: dict[str, Any]
    outliers: dict[str, Any]
    correlation: dict[str, Any]
    created_at: datetime


class QualityReportSummary(BaseModel):
    """Lightweight summary used in history lists, avoiding large JSONB payloads."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    dataset_id: int
    quality_score: float
    created_at: datetime
    issue_count: int


class ReportHistoryResponse(BaseModel):
    items: list[QualityReportSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class ReportComparisonResponse(BaseModel):
    report_a: QualityReportRead
    report_b: QualityReportRead
    score_delta: float
    improved: bool
    new_issues: list[QualityIssue]
    resolved_issues: list[QualityIssue]
