from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthError
from app.core.security import TokenError, decode_token
from app.db.redis_client import get_redis
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.cache_service import CacheService

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AuthError("Missing bearer token.", error_code="missing_token")
    try:
        user_id = decode_token(credentials.credentials, expected_type="access")
    except TokenError as exc:
        raise AuthError(str(exc), error_code="invalid_token") from exc

    user = UserRepository(db).get_by_id(user_id)
    if not user or not user.is_active:
        raise AuthError("User no longer exists or is inactive.", error_code="invalid_token")
    return user


def get_cache_service() -> CacheService:
    return CacheService(get_redis())
