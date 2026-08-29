import os
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import FileTooLargeError, NotFoundError, UnsupportedFileError, ValidationAppError
from app.models.dataset import Dataset, DatasetStatus
from app.processing.loader import DatasetLoadError, load_dataframe
from app.processing.profiling import profile_dataset
from app.repositories.dataset_repository import DatasetRepository

ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls"}


class DatasetService:
    def __init__(self, db: Session):
        self.db = db
        self.datasets = DatasetRepository(db)

    def _validate_upload(self, filename: str, size_bytes: int) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise UnsupportedFileError(f"Unsupported file extension: .{ext}. Allowed: csv, xlsx, xls.")
        if size_bytes > settings.max_upload_size_bytes:
            raise FileTooLargeError(f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB upload limit.")
        return ext

    def save_upload(self, *, owner_id: int, filename: str, content: bytes, display_name: str | None) -> Dataset:
        ext = self._validate_upload(filename, len(content))

        upload_dir = Path(settings.UPLOAD_DIR) / str(owner_id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}.{ext}"
        file_path = upload_dir / stored_name
        file_path.write_bytes(content)

        dataset = self.datasets.create(
            owner_id=owner_id,
            name=display_name or filename,
            original_filename=filename,
            file_path=str(file_path),
            file_size_bytes=len(content),
            file_type=ext,
            status=DatasetStatus.UPLOADED,
        )

        self._validate_dataset(dataset)
        return self.datasets.get_by_id(dataset.id)

    def _validate_dataset(self, dataset: Dataset) -> None:
        self.datasets.update_status(dataset, DatasetStatus.VALIDATING)
        try:
            df = load_dataframe(dataset.file_path, dataset.file_type)
        except DatasetLoadError as exc:
            self.datasets.update_status(dataset, DatasetStatus.INVALID, error=str(exc))
            return

        profile = profile_dataset(df)
        self.datasets.set_shape(dataset, row_count=profile["row_count"], column_count=profile["column_count"])
        self.datasets.replace_columns(dataset, [
            {
                "name": c["name"],
                "position": c["position"],
                "detected_type": c["detected_type"],
                "missing_count": c["missing_count"],
                "missing_percentage": c["missing_percentage"],
                "unique_count": c["unique_count"],
                "is_constant": c["is_constant"],
                "extra_stats": {"sample_values": c["sample_values"]},
            }
            for c in profile["columns"]
        ])
        self.datasets.update_status(dataset, DatasetStatus.VALID)

    def get_owned_or_404(self, dataset_id: int, owner_id: int) -> Dataset:
        dataset = self.datasets.get_owned(dataset_id, owner_id)
        if not dataset:
            raise NotFoundError("Dataset not found.")
        return dataset

    def list_datasets(self, owner_id: int, *, page: int, page_size: int, search: str | None, status):
        return self.datasets.list_for_owner(owner_id, page=page, page_size=page_size, search=search, status=status)

    def delete_dataset(self, dataset: Dataset) -> None:
        try:
            if os.path.exists(dataset.file_path):
                os.remove(dataset.file_path)
        except OSError:
            pass  # File removal is best-effort; DB row deletion (with cascade) is the source of truth.
        self.datasets.delete(dataset)

    def preview_dataset(self, dataset: Dataset, limit: int = 50) -> dict:
        if dataset.status not in (DatasetStatus.VALID, DatasetStatus.ANALYZED):
            raise ValidationAppError("Dataset has not passed validation yet.")
        df = load_dataframe(dataset.file_path, dataset.file_type)
        preview = df.head(limit).where(df.head(limit).notna(), None)
        return {
            "columns": list(df.columns),
            "rows": preview.to_dict(orient="records"),
            "total_rows": len(df),
            "previewed_rows": len(preview),
        }
