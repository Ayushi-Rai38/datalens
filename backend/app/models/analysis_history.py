from datetime import datetime

from sqlalchemy import ForeignKey, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class AnalysisHistory(Base):
    """Audit trail of analysis runs, independent of the (larger) report payload."""

    __tablename__ = "analysis_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    report_id: Mapped[int | None] = mapped_column(ForeignKey("quality_reports.id", ondelete="SET NULL"), nullable=True)

    triggered_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="success")  # success | failed
    error_message: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
