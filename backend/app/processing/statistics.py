"""Numerical and categorical descriptive statistics."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats

from app.processing.profiling import _safe_float
from app.processing.type_detection import detect_column_type


def compute_numerical_stats(df: pd.DataFrame) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for col in df.columns:
        series = df[col]
        if detect_column_type(series) != "numeric":
            continue

        clean = pd.to_numeric(series, errors="coerce").replace([np.inf, -np.inf], np.nan).dropna()
        if clean.empty:
            result[col] = {"count": 0}
            continue

        skew = _safe_float(scipy_stats.skew(clean)) if len(clean) >= 3 else None
        kurtosis = _safe_float(scipy_stats.kurtosis(clean)) if len(clean) >= 4 else None

        result[col] = {
            "count": int(clean.count()),
            "mean": _safe_float(clean.mean()),
            "std": _safe_float(clean.std()) if len(clean) > 1 else 0.0,
            "min": _safe_float(clean.min()),
            "max": _safe_float(clean.max()),
            "q1": _safe_float(clean.quantile(0.25)),
            "median": _safe_float(clean.median()),
            "q3": _safe_float(clean.quantile(0.75)),
            "skewness": skew,
            "kurtosis": kurtosis,
            "zero_count": int((clean == 0).sum()),
            "negative_count": int((clean < 0).sum()),
        }
    return result


def compute_categorical_stats(df: pd.DataFrame, top_n: int = 10) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for col in df.columns:
        series = df[col]
        if detect_column_type(series) not in ("categorical", "boolean"):
            continue

        non_null = series.dropna().astype(str)
        if non_null.empty:
            result[col] = {"count": 0, "top_values": []}
            continue

        counts = non_null.value_counts().head(top_n)
        total = len(non_null)
        result[col] = {
            "count": total,
            "unique_count": int(non_null.nunique()),
            "top_values": [
                {"value": v, "count": int(c), "percentage": _safe_float(c / total * 100)}
                for v, c in counts.items()
            ],
        }
    return result
