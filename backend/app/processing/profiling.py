"""Dataset-level and column-level profiling.

Pure pandas/numpy logic, independent of FastAPI/DB so it can be unit tested
directly against DataFrames.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from app.processing.type_detection import detect_column_type


def _safe_float(value: Any) -> float | None:
    """Converts numpy scalars to JSON-safe floats, mapping NaN/Inf to None."""
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def profile_dataset(df: pd.DataFrame) -> dict[str, Any]:
    n_rows, n_cols = df.shape
    duplicate_rows = int(df.duplicated().sum())

    columns: list[dict[str, Any]] = []
    for position, col in enumerate(df.columns):
        series = df[col]
        columns.append(profile_column(series, position))

    return {
        "row_count": n_rows,
        "column_count": n_cols,
        "duplicate_row_count": duplicate_rows,
        "duplicate_row_percentage": _safe_float(duplicate_rows / n_rows * 100) if n_rows else 0.0,
        "columns": columns,
    }


def profile_column(series: pd.Series, position: int) -> dict[str, Any]:
    n = len(series)
    missing_count = int(series.isna().sum())
    missing_percentage = _safe_float((missing_count / n * 100) if n else 0.0)
    non_null = series.dropna()
    unique_count = int(non_null.nunique())
    detected_type = detect_column_type(series)

    is_constant = unique_count <= 1 and missing_count < n

    result: dict[str, Any] = {
        "name": str(series.name),
        "position": position,
        "detected_type": detected_type,
        "missing_count": missing_count,
        "missing_percentage": missing_percentage,
        "unique_count": unique_count,
        "is_constant": is_constant,
        "sample_values": [_json_safe(v) for v in non_null.head(5).tolist()],
    }
    return result


def _json_safe(value: Any) -> Any:
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        f = float(value)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if isinstance(value, np.bool_):
        return bool(value)
    return value
