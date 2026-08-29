import math

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_cache_service, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analysis import QualityReportRead, ReportComparisonResponse, ReportHistoryResponse
from app.services.analysis_service import AnalysisService
from app.services.cache_service import CacheService
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/api/v1/analysis", tags=["analysis"])


@router.post("/{dataset_id}/run", response_model=QualityReportRead, status_code=status.HTTP_201_CREATED)
def run_analysis(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(get_cache_service),
):
    # Ownership check happens through DatasetService before any analysis work occurs.
    DatasetService(db).get_owned_or_404(dataset_id, current_user.id)
    return AnalysisService(db, cache).run_analysis(dataset_id, triggered_by=current_user.id)


@router.get("/{dataset_id}/latest", response_model=QualityReportRead)
def get_latest_report(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(get_cache_service),
):
    DatasetService(db).get_owned_or_404(dataset_id, current_user.id)
    return AnalysisService(db, cache).get_latest_report(dataset_id)


@router.get("/{dataset_id}/history", response_model=ReportHistoryResponse)
def get_history(
    dataset_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(get_cache_service),
):
    DatasetService(db).get_owned_or_404(dataset_id, current_user.id)
    items, total = AnalysisService(db, cache).get_report_history(dataset_id, page=page, page_size=page_size)
    summaries = [
        {"id": r.id, "dataset_id": r.dataset_id, "quality_score": r.quality_score,
         "created_at": r.created_at, "issue_count": len(r.quality_issues)}
        for r in items
    ]
    total_pages = math.ceil(total / page_size) if total else 0
    return ReportHistoryResponse(items=summaries, total=total, page=page, page_size=page_size, total_pages=total_pages)


@router.get("/reports/compare", response_model=ReportComparisonResponse)
def compare_reports(
    report_a: int = Query(...),
    report_b: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(get_cache_service),
):
    service = AnalysisService(db, cache)
    a = service.get_report(report_a)
    b = service.get_report(report_b)
    # Verify the requesting user owns the datasets both reports belong to.
    ds_service = DatasetService(db)
    ds_service.get_owned_or_404(a.dataset_id, current_user.id)
    ds_service.get_owned_or_404(b.dataset_id, current_user.id)
    return service.compare_reports(report_a, report_b)
