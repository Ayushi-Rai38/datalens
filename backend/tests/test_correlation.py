import pandas as pd

from app.processing.correlation import compute_correlation


def test_correlation_requires_two_numeric_columns():
    df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})
    result = compute_correlation(df)
    assert result["available"] is False


def test_correlation_detects_strong_relationship():
    df = pd.DataFrame({"a": [1, 2, 3, 4, 5], "b": [2, 4, 6, 8, 10]})
    result = compute_correlation(df)
    assert result["available"] is True
    assert result["matrix"]["a"]["b"] == 1.0
    assert len(result["strong_pairs"]) == 1


def test_correlation_ignores_constant_column():
    df = pd.DataFrame({"a": [1, 2, 3, 4, 5], "constant": [1, 1, 1, 1, 1]})
    result = compute_correlation(df)
    assert result["available"] is False


def test_correlation_handles_insufficient_rows():
    df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
    result = compute_correlation(df)
    assert result["available"] is False
