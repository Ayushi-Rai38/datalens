import time

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.dataset import DatasetStatus
from app.processing.loader import DatasetLoadError, load_dataframe
from app.processing.pipeline import run_full_analysis
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.report_repository import ReportRepository
from app.services.cache_service import CacheService


class AnalysisService:
    def __init__(self, db: Session, cache: CacheService):
        self.db = db
        self.datasets = DatasetRepository(db)
        self.reports = ReportRepository(db)
        self.cache = cache

    def run_analysis(self, dataset_id: int, triggered_by: int):
        dataset = self.datasets.get_by_id(dataset_id)
        if not dataset:
            raise NotFoundError("Dataset not found.")
        if dataset.status not in (DatasetStatus.VALID, DatasetStatus.ANALYZED):
            raise ValidationAppError("Dataset must pass validation before it can be analyzed.")

        started = time.perf_counter()
        self.datasets.update_status(dataset, DatasetStatus.ANALYZING)
        try:
            df = load_dataframe(dataset.file_path, dataset.file_type)
            result = run_full_analysis(df)
        except DatasetLoadError as exc:
            self.datasets.update_status(dataset, DatasetStatus.FAILED, error=str(exc))
            self.reports.log_history(
                dataset_id=dataset_id, triggered_by=triggered_by, status="failed", error_message=str(exc),
                duration_ms=int((time.perf_counter() - started) * 1000),
            )
            raise ValidationAppError(f"Analysis failed: {exc}") from exc

        report = self.reports.create(
            dataset_id=dataset_id,
            quality_score=result["quality_score"],
            profiling_result=result["profiling"],
            quality_issues=result["quality_issues"],
            numerical_stats=result["numerical_stats"],
            categorical_stats=result["categorical_stats"],
            outliers=result["outliers"],
            correlation=result["correlation"],
        )
        self.datasets.update_status(dataset, DatasetStatus.ANALYZED)
        self.reports.log_history(
            dataset_id=dataset_id, report_id=report.id, triggered_by=triggered_by, status="success",
            duration_ms=int((time.perf_counter() - started) * 1000),
        )

        # A freshly computed report invalidates whatever the cache held before it.
        self.cache.invalidate(dataset_id)
        self.cache.set_latest_report(dataset_id, _serializable_report(report))
        return report

    def get_latest_report(self, dataset_id: int):
        cached = self.cache.get_latest_report(dataset_id)
        if cached:
            return cached
        report = self.reports.get_latest_for_dataset(dataset_id)
        if not report:
            raise NotFoundError("No analysis report exists for this dataset yet.")
        serializable = _serializable_report(report)
        self.cache.set_latest_report(dataset_id, serializable)
        return serializable

    def get_report_history(self, dataset_id: int, *, page: int, page_size: int):
        return self.reports.list_for_dataset(dataset_id, page=page, page_size=page_size)

    def get_report(self, report_id: int):
        report = self.reports.get_by_id(report_id)
        if not report:
            raise NotFoundError("Report not found.")
        return report

    def compare_reports(self, report_a_id: int, report_b_id: int):
        report_a = self.get_report(report_a_id)
        report_b = self.get_report(report_b_id)

        issues_a = {i["code"] for i in report_a.quality_issues}
        issues_b = {i["code"] for i in report_b.quality_issues}
        new_issues = [i for i in report_b.quality_issues if i["code"] not in issues_a]
        resolved_issues = [i for i in report_a.quality_issues if i["code"] not in issues_b]

        return {
            "report_a": report_a,
            "report_b": report_b,
            "score_delta": round(report_b.quality_score - report_a.quality_score, 2),
            "improved": report_b.quality_score >= report_a.quality_score,
            "new_issues": new_issues,
            "resolved_issues": resolved_issues,
        }


def _serializable_report(report) -> dict:
    return {
        "id": report.id,
        "dataset_id": report.dataset_id,
        "quality_score": report.quality_score,
        "profiling_result": report.profiling_result,
        "quality_issues": report.quality_issues,
        "numerical_stats": report.numerical_stats,
        "categorical_stats": report.categorical_stats,
        "outliers": report.outliers,
        "correlation": report.correlation,
        "created_at": report.created_at.isoformat() if hasattr(report.created_at, "isoformat") else report.created_at,
    }
