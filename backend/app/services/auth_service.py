from sqlalchemy.orm import Session

from app.core.exceptions import AuthError, ConflictError
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password, TokenError
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import TokenPair, UserCreate


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def register(self, payload: UserCreate) -> User:
        if self.users.get_by_email(payload.email):
            raise ConflictError("An account with this email already exists.", error_code="email_taken")
        return self.users.create(
            email=payload.email,
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name,
        )

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise AuthError("Incorrect email or password.", error_code="invalid_credentials")
        if not user.is_active:
            raise AuthError("This account has been deactivated.", error_code="account_inactive")
        return user

    def issue_tokens(self, user: User) -> TokenPair:
        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    def refresh_access_token(self, refresh_token: str) -> TokenPair:
        try:
            user_id = decode_token(refresh_token, expected_type="refresh")
        except TokenError as exc:
            raise AuthError(str(exc), error_code="invalid_refresh_token") from exc

        user = self.users.get_by_id(user_id)
        if not user or not user.is_active:
            raise AuthError("User no longer exists or is inactive.", error_code="invalid_refresh_token")

        return self.issue_tokens(user)
