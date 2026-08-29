"""Orchestrates the full analysis pipeline over a loaded DataFrame.

This is the single entry point the service layer calls; it has no knowledge
of FastAPI, SQLAlchemy, or Redis, which is what makes it trivially unit
testable with plain DataFrames.
"""
from __future__ import annotations

from typing import Any

import pandas as pd

from app.processing.correlation import compute_correlation
from app.processing.outliers import detect_outliers_iqr
from app.processing.profiling import profile_dataset
from app.processing.quality_score import compute_quality_score
from app.processing.statistics import compute_categorical_stats, compute_numerical_stats


def run_full_analysis(df: pd.DataFrame) -> dict[str, Any]:
    profiling = profile_dataset(df)
    numerical_stats = compute_numerical_stats(df)
    categorical_stats = compute_categorical_stats(df)
    outliers = detect_outliers_iqr(df)
    correlation = compute_correlation(df)
    quality_score, issues = compute_quality_score(profiling, outliers)

    return {
        "profiling": profiling,
        "numerical_stats": numerical_stats,
        "categorical_stats": categorical_stats,
        "outliers": outliers,
        "correlation": correlation,
        "quality_score": quality_score,
        "quality_issues": issues,
    }
