from datetime import datetime

from sqlalchemy import ForeignKey, Float, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class QualityReport(Base):
    """A single point-in-time analysis run for a dataset. Immutable once created."""

    __tablename__ = "quality_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)

    quality_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Variable-shaped nested analysis output stored as JSONB.
    profiling_result: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    quality_issues: Mapped[list] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    numerical_stats: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    categorical_stats: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    outliers: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    correlation: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    dataset: Mapped["Dataset"] = relationship(back_populates="reports")
