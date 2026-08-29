"""Explainable 0-100 data-quality score.

The score starts at 100 and measurable issues subtract points, each with a
recorded reason, weight, and severity so the frontend can show *why* a
dataset received its score instead of a bare number.
"""
from __future__ import annotations

from typing import Any

HIGH_MISSING_THRESHOLD = 50.0   # % missing considered "high missingness"
MODERATE_MISSING_THRESHOLD = 10.0
HIGH_DUPLICATE_THRESHOLD = 10.0  # % duplicate rows
HIGH_OUTLIER_THRESHOLD = 10.0    # % outliers in a numeric column

MAX_PENALTY = {
    "missing_values": 30,
    "duplicate_rows": 15,
    "constant_columns": 15,
    "outliers": 15,
    "high_missingness_columns": 15,
    "type_inconsistency": 10,
}


def compute_quality_score(profiling: dict[str, Any], outliers: dict[str, Any]) -> tuple[float, list[dict[str, Any]]]:
    """Returns (score, issues). `issues` is a list of {code, message, severity, penalty}."""
    issues: list[dict[str, Any]] = []
    total_penalty = 0.0

    columns = profiling["columns"]
    n_cols = max(len(columns), 1)

    # 1. Missing values (dataset-wide average, capped contribution).
    avg_missing_pct = sum(c["missing_percentage"] for c in columns) / n_cols
    if avg_missing_pct > 0:
        penalty = min(MAX_PENALTY["missing_values"], avg_missing_pct * 0.5)
        total_penalty += penalty
        severity = "high" if avg_missing_pct > MODERATE_MISSING_THRESHOLD else "low"
        issues.append({
            "code": "missing_values",
            "message": f"Dataset has an average of {avg_missing_pct:.1f}% missing values across all columns.",
            "severity": severity,
            "penalty": round(penalty, 2),
        })

    # 2. High-missingness columns (individually flagged, beyond the average penalty above).
    high_missing_cols = [c["name"] for c in columns if c["missing_percentage"] >= HIGH_MISSING_THRESHOLD]
    if high_missing_cols:
        penalty = min(MAX_PENALTY["high_missingness_columns"], 5 * len(high_missing_cols))
        total_penalty += penalty
        issues.append({
            "code": "high_missingness_columns",
            "message": f"{len(high_missing_cols)} column(s) are missing over {HIGH_MISSING_THRESHOLD:.0f}% of values: "
                       f"{', '.join(high_missing_cols[:5])}{'...' if len(high_missing_cols) > 5 else ''}.",
            "severity": "high",
            "penalty": round(penalty, 2),
        })

    # 3. Duplicate rows.
    dup_pct = profiling.get("duplicate_row_percentage") or 0.0
    if dup_pct > 0:
        penalty = min(MAX_PENALTY["duplicate_rows"], dup_pct * 0.5)
        total_penalty += penalty
        issues.append({
            "code": "duplicate_rows",
            "message": f"{dup_pct:.1f}% of rows are exact duplicates.",
            "severity": "high" if dup_pct > HIGH_DUPLICATE_THRESHOLD else "low",
            "penalty": round(penalty, 2),
        })

    # 4. Constant columns (zero information value).
    constant_cols = [c["name"] for c in columns if c["is_constant"]]
    if constant_cols:
        penalty = min(MAX_PENALTY["constant_columns"], 5 * len(constant_cols))
        total_penalty += penalty
        issues.append({
            "code": "constant_columns",
            "message": f"{len(constant_cols)} column(s) contain a single repeated value: "
                       f"{', '.join(constant_cols[:5])}{'...' if len(constant_cols) > 5 else ''}.",
            "severity": "medium",
            "penalty": round(penalty, 2),
        })

    # 5. Outliers (average outlier % across numeric columns that had enough data).
    outlier_pcts = [
        v["outlier_percentage"] for v in outliers.values()
        if not v.get("insufficient_data") and v.get("outlier_percentage") is not None
    ]
    if outlier_pcts:
        avg_outlier_pct = sum(outlier_pcts) / len(outlier_pcts)
        if avg_outlier_pct > 0:
            penalty = min(MAX_PENALTY["outliers"], avg_outlier_pct * 0.75)
            total_penalty += penalty
            issues.append({
                "code": "outliers",
                "message": f"Numerical columns contain an average of {avg_outlier_pct:.1f}% IQR outliers.",
                "severity": "high" if avg_outlier_pct > HIGH_OUTLIER_THRESHOLD else "low",
                "penalty": round(penalty, 2),
            })

    score = max(0.0, round(100.0 - total_penalty, 2))
    issues.sort(key=lambda i: i["penalty"], reverse=True)
    return score, issues
