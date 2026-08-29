import enum
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer, BigInteger, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class DatasetStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    VALIDATING = "validating"
    VALID = "valid"
    INVALID = "invalid"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    FAILED = "failed"


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)  # csv | xlsx

    status: Mapped[DatasetStatus] = mapped_column(
    Enum(   
        DatasetStatus,
        name="dataset_status",
        values_callable=lambda enum_cls: [e.value for e in enum_cls],
    ),
    default=DatasetStatus.UPLOADED,
    index=True,
)
    validation_error: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    column_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship(back_populates="datasets")
    columns: Mapped[list["DatasetColumn"]] = relationship(
        back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True
    )
    reports: Mapped[list["QualityReport"]] = relationship(
        back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True,
        order_by="QualityReport.created_at.desc()",
    )
