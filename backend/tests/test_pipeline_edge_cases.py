"""Edge cases the pipeline must survive without crashing."""
import numpy as np
import pandas as pd

from app.processing.pipeline import run_full_analysis


def test_all_numeric_dataset():
    df = pd.DataFrame({"a": [1, 2, 3, 4], "b": [5.0, 6.0, 7.0, 8.0]})
    result = run_full_analysis(df)
    assert result["quality_score"] >= 0


def test_all_categorical_dataset():
    df = pd.DataFrame({"a": ["x", "y", "x", "z"], "b": ["p", "q", "p", "q"]})
    result = run_full_analysis(df)
    assert result["correlation"]["available"] is False
    assert result["quality_score"] >= 0


def test_dataset_with_infinite_values():
    df = pd.DataFrame({"a": [1, 2, np.inf, -np.inf, 5]})
    result = run_full_analysis(df)
    # Infinities must be neutralized (treated as missing) rather than propagate into JSON output.
    assert result["numerical_stats"]["a"]["max"] is not None
    assert not np.isinf(result["numerical_stats"]["a"]["max"])


def test_very_small_dataset_single_row():
    df = pd.DataFrame({"a": [1], "b": ["x"]})
    result = run_full_analysis(df)
    assert result["profiling"]["row_count"] == 1
    assert result["correlation"]["available"] is False


def test_single_column_dataset():
    df = pd.DataFrame({"a": [1, 2, 3, 4, 5]})
    result = run_full_analysis(df)
    assert result["correlation"]["available"] is False
    assert result["quality_score"] >= 0
