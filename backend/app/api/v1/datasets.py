import math

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.dataset import DatasetStatus
from app.models.user import User
from app.schemas.dataset import DatasetColumnRead, DatasetListResponse, DatasetPreviewResponse, DatasetRead
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])


@router.post("", response_model=DatasetRead, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await file.read()
    service = DatasetService(db)
    return service.save_upload(owner_id=current_user.id, filename=file.filename, content=content, display_name=name)


@router.get("", response_model=DatasetListResponse)
def list_datasets(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: str | None = Query(default=None),
    status_filter: DatasetStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DatasetService(db)
    items, total = service.list_datasets(current_user.id, page=page, page_size=page_size, search=search, status=status_filter)
    total_pages = math.ceil(total / page_size) if total else 0
    return DatasetListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


@router.get("/{dataset_id}", response_model=DatasetRead)
def get_dataset(dataset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = DatasetService(db)
    return service.get_owned_or_404(dataset_id, current_user.id)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(dataset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = DatasetService(db)
    dataset = service.get_owned_or_404(dataset_id, current_user.id)
    service.delete_dataset(dataset)


@router.get("/{dataset_id}/columns", response_model=list[DatasetColumnRead])
def get_columns(dataset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = DatasetService(db)
    dataset = service.get_owned_or_404(dataset_id, current_user.id)
    return dataset.columns


@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def preview_dataset(
    dataset_id: int, limit: int = Query(default=50, ge=1, le=500),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    service = DatasetService(db)
    dataset = service.get_owned_or_404(dataset_id, current_user.id)
    return service.preview_dataset(dataset, limit=limit)
