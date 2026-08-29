from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.dataset import Dataset, DatasetStatus
from app.models.dataset_column import DatasetColumn


class DatasetRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> Dataset:
        dataset = Dataset(**kwargs)
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def get_by_id(self, dataset_id: int) -> Dataset | None:
        return self.db.get(Dataset, dataset_id)

    def get_owned(self, dataset_id: int, owner_id: int) -> Dataset | None:
        stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == owner_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_for_owner(
        self, owner_id: int, *, page: int, page_size: int, search: str | None = None,
        status: DatasetStatus | None = None,
    ) -> tuple[list[Dataset], int]:
        stmt = select(Dataset).where(Dataset.owner_id == owner_id)
        count_stmt = select(func.count()).select_from(Dataset).where(Dataset.owner_id == owner_id)

        if search:
            like = f"%{search}%"
            stmt = stmt.where(Dataset.name.ilike(like))
            count_stmt = count_stmt.where(Dataset.name.ilike(like))
        if status:
            stmt = stmt.where(Dataset.status == status)
            count_stmt = count_stmt.where(Dataset.status == status)

        total = self.db.execute(count_stmt).scalar_one()
        stmt = stmt.order_by(Dataset.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def update_status(self, dataset: Dataset, status: DatasetStatus, *, error: str | None = None) -> Dataset:
        dataset.status = status
        dataset.validation_error = error
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def set_shape(self, dataset: Dataset, *, row_count: int, column_count: int) -> Dataset:
        dataset.row_count = row_count
        dataset.column_count = column_count
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def replace_columns(self, dataset: Dataset, columns: list[dict]) -> None:
        self.db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).delete()
        for col in columns:
            self.db.add(DatasetColumn(dataset_id=dataset.id, **col))
        self.db.commit()

    def delete(self, dataset: Dataset) -> None:
        self.db.delete(dataset)
        self.db.commit()
