"""Column-level data type detection.

We go beyond pandas' raw dtype because a CSV column full of "1", "2", "3"
loads as int64 already, but a column of "TRUE"/"FALSE" strings loads as
object and should be reported as boolean, and low-cardinality integer/text
columns are more useful to a data-quality tool when labelled 'categorical'.
"""
from __future__ import annotations

import pandas as pd

CATEGORICAL_UNIQUE_RATIO_THRESHOLD = 0.05
CATEGORICAL_MAX_UNIQUE = 50

BOOL_TRUE_VALUES = {"true", "yes", "y", "1"}
BOOL_FALSE_VALUES = {"false", "no", "n", "0"}


def detect_column_type(series: pd.Series) -> str:
    """Returns one of: numeric, boolean, datetime, categorical, text."""
    non_null = series.dropna()
    if non_null.empty:
        return "text"

    if pd.api.types.is_bool_dtype(series):
        return "boolean"

    if pd.api.types.is_numeric_dtype(series):
        unique_vals = set(non_null.unique().tolist())
        if unique_vals.issubset({0, 1}):
            return "boolean"
        return "numeric"

    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"

    if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
        lowered = non_null.astype(str).str.strip().str.lower()
        if set(lowered.unique().tolist()).issubset(BOOL_TRUE_VALUES | BOOL_FALSE_VALUES):
            return "boolean"

        parsed_dates = pd.to_datetime(non_null, errors="coerce", format="mixed")
        if parsed_dates.notna().mean() > 0.9:
            return "datetime"

        unique_ratio = non_null.nunique() / max(len(non_null), 1)
        if non_null.nunique() <= CATEGORICAL_MAX_UNIQUE or unique_ratio <= CATEGORICAL_UNIQUE_RATIO_THRESHOLD:
            return "categorical"

        return "text"

    return "text"
