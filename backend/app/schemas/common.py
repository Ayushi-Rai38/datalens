from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error_code: str
    message: str


class HealthResponse(BaseModel):
    status: str
    database: str
    redis: str
