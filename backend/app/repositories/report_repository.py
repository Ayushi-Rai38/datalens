from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.quality_report import QualityReport
from app.models.analysis_history import AnalysisHistory


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> QualityReport:
        report = QualityReport(**kwargs)
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def get_by_id(self, report_id: int) -> QualityReport | None:
        return self.db.get(QualityReport, report_id)

    def get_latest_for_dataset(self, dataset_id: int) -> QualityReport | None:
        stmt = (
            select(QualityReport)
            .where(QualityReport.dataset_id == dataset_id)
            .order_by(QualityReport.created_at.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_for_dataset(self, dataset_id: int, *, page: int, page_size: int) -> tuple[list[QualityReport], int]:
        count_stmt = select(func.count()).select_from(QualityReport).where(QualityReport.dataset_id == dataset_id)
        total = self.db.execute(count_stmt).scalar_one()

        stmt = (
            select(QualityReport)
            .where(QualityReport.dataset_id == dataset_id)
            .order_by(QualityReport.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def log_history(self, **kwargs) -> AnalysisHistory:
        entry = AnalysisHistory(**kwargs)
        self.db.add(entry)
        self.db.commit()
        return entry
