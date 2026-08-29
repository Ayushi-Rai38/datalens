"""Application-level exception hierarchy mapped to HTTP responses centrally."""


class AppError(Exception):
    """Base class for all handled application errors."""

    status_code: int = 500
    error_code: str = "internal_error"

    def __init__(self, message: str, *, error_code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if error_code:
            self.error_code = error_code
        if status_code:
            self.status_code = status_code


class NotFoundError(AppError):
    status_code = 404
    error_code = "not_found"


class ValidationAppError(AppError):
    status_code = 422
    error_code = "validation_error"


class AuthError(AppError):
    status_code = 401
    error_code = "authentication_error"


class PermissionDeniedError(AppError):
    status_code = 403
    error_code = "permission_denied"


class ConflictError(AppError):
    status_code = 409
    error_code = "conflict"


class UnsupportedFileError(AppError):
    status_code = 400
    error_code = "unsupported_file"


class FileTooLargeError(AppError):
    status_code = 413
    error_code = "file_too_large"
