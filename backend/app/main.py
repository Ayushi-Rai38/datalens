import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.api.v1 import analysis, auth, datasets, health
from app.core.config import settings
from app.core.exceptions import AppError
from app.core.logging_config import configure_logging

configure_logging("DEBUG" if settings.ENVIRONMENT == "development" else "INFO")
logger = logging.getLogger("datalens")

app = FastAPI(
    title="DataLens API",
    description="Automated dataset analysis and data-quality assessment platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - start) * 1000)
    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"error_code": exc.error_code, "message": exc.message})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error_code": "validation_error", "message": "Request validation failed.", "details": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception("unhandled_exception")
    return JSONResponse(status_code=500, content={"error_code": "internal_error", "message": "An unexpected error occurred."})


app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(analysis.router)
app.include_router(health.router)


@app.get("/")
def root():
    return {"service": "DataLens API", "docs": "/docs"}
