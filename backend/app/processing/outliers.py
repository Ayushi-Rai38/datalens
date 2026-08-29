"""IQR-based outlier detection for numerical columns."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.processing.profiling import _safe_float
from app.processing.type_detection import detect_column_type

MIN_ROWS_FOR_OUTLIER_DETECTION = 4


def detect_outliers_iqr(df: pd.DataFrame) -> dict[str, Any]:
    result: dict[str, Any] = {}

    for col in df.columns:
        series = df[col]
        if detect_column_type(series) != "numeric":
            continue

        clean = pd.to_numeric(series, errors="coerce").replace([np.inf, -np.inf], np.nan).dropna()

        if len(clean) < MIN_ROWS_FOR_OUTLIER_DETECTION:
            result[col] = {
                "outlier_count": 0,
                "outlier_percentage": 0.0,
                "lower_bound": None,
                "upper_bound": None,
                "insufficient_data": True,
            }
            continue

        q1 = clean.quantile(0.25)
        q3 = clean.quantile(0.75)
        iqr = q3 - q1

        if iqr == 0:
            # Degenerate distribution (e.g. near-constant column) - nothing is an outlier by IQR.
            result[col] = {
                "outlier_count": 0,
                "outlier_percentage": 0.0,
                "lower_bound": _safe_float(q1),
                "upper_bound": _safe_float(q3),
                "insufficient_data": False,
            }
            continue

        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        mask = (clean < lower_bound) | (clean > upper_bound)
        outlier_count = int(mask.sum())

        result[col] = {
            "outlier_count": outlier_count,
            "outlier_percentage": _safe_float(outlier_count / len(clean) * 100),
            "lower_bound": _safe_float(lower_bound),
            "upper_bound": _safe_float(upper_bound),
            "sample_outlier_values": [_safe_float(v) for v in clean[mask].head(10).tolist()],
            "insufficient_data": False,
        }

    return result
