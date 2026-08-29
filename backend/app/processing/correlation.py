"""Pearson correlation between numerical columns, with guards for edge cases."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.processing.profiling import _safe_float
from app.processing.type_detection import detect_column_type

MIN_ROWS_FOR_CORRELATION = 3
MIN_NUMERIC_COLUMNS = 2


def compute_correlation(df: pd.DataFrame) -> dict[str, Any]:
    numeric_cols = [c for c in df.columns if detect_column_type(df[c]) == "numeric"]

    if len(numeric_cols) < MIN_NUMERIC_COLUMNS:
        return {
            "available": False,
            "reason": "Fewer than two numerical columns are available.",
            "columns": numeric_cols,
            "matrix": {},
        }

    numeric_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan)

    # Drop columns with zero variance - correlation against a constant is undefined (division by zero).
    variable_cols = [c for c in numeric_cols if numeric_df[c].nunique(dropna=True) > 1]
    if len(variable_cols) < MIN_NUMERIC_COLUMNS:
        return {
            "available": False,
            "reason": "Fewer than two non-constant numerical columns are available.",
            "columns": numeric_cols,
            "matrix": {},
        }

    usable_rows = numeric_df[variable_cols].dropna(how="any")
    if len(usable_rows) < MIN_ROWS_FOR_CORRELATION:
        return {
            "available": False,
            "reason": "Not enough complete rows to compute a reliable correlation.",
            "columns": variable_cols,
            "matrix": {},
        }

    corr_matrix = numeric_df[variable_cols].corr(method="pearson", min_periods=MIN_ROWS_FOR_CORRELATION)

    matrix: dict[str, dict[str, float | None]] = {}
    strong_pairs: list[dict[str, Any]] = []
    for row_col in variable_cols:
        matrix[row_col] = {}
        for col_col in variable_cols:
            value = _safe_float(corr_matrix.loc[row_col, col_col])
            matrix[row_col][col_col] = value
            if row_col < col_col and value is not None and abs(value) >= 0.7:
                strong_pairs.append({"column_a": row_col, "column_b": col_col, "correlation": value})

    return {
        "available": True,
        "reason": None,
        "columns": variable_cols,
        "matrix": matrix,
        "strong_pairs": sorted(strong_pairs, key=lambda p: abs(p["correlation"]), reverse=True),
    }
