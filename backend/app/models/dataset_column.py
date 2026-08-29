from sqlalchemy import String, ForeignKey, Integer, Float, Boolean, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class DatasetColumn(Base):
    """Per-column metadata captured once during dataset profiling."""

    __tablename__ = "dataset_columns"

    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    detected_type: Mapped[str] = mapped_column(String(50), nullable=False)  # numeric|categorical|boolean|datetime|text

    missing_count: Mapped[int] = mapped_column(Integer, default=0)
    missing_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    unique_count: Mapped[int] = mapped_column(Integer, default=0)
    is_constant: Mapped[bool] = mapped_column(Boolean, default=False)

    extra_stats: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), default=dict)

    dataset: Mapped["Dataset"] = relationship(back_populates="columns")
