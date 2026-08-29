import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("UPLOAD_DIR", "./test_uploads")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import fakeredis
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.db.session import Base, get_db
from app.main import app
from app.services.cache_service import CacheService

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


fake_redis_client = fakeredis.FakeRedis(decode_responses=True)


def override_get_cache_service():
    return CacheService(fake_redis_client)


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[deps.get_cache_service] = override_get_cache_service


@pytest.fixture
def client():
    fake_redis_client.flushall()
    return TestClient(app)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def auth_headers(client):
    client.post("/api/v1/auth/register", json={"email": "test@example.com", "password": "password123"})
    resp = client.post("/api/v1/auth/login", json={"email": "test@example.com", "password": "password123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def clean_df() -> pd.DataFrame:
    return pd.DataFrame({
        "id": range(1, 11),
        "age": [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
        "category": ["A", "B", "A", "B", "A", "B", "A", "B", "A", "B"],
    })


@pytest.fixture
def messy_df() -> pd.DataFrame:
    return pd.DataFrame({
        "id": range(1, 11),
        "value": [10, 20, None, 40, 50, 1000, 20, None, 40, 50],
        "constant_col": ["x"] * 10,
        "mostly_null": [None] * 9 + [1],
        "category": ["A", "B", "A", "B", "A", "B", "A", "B", "A", None],
    })
