import pandas as pd

from app.processing.outliers import detect_outliers_iqr


def test_no_outliers_in_uniform_data():
    df = pd.DataFrame({"a": [10, 11, 12, 13, 14, 15]})
    result = detect_outliers_iqr(df)
    assert result["a"]["outlier_count"] == 0


def test_detects_clear_outlier():
    df = pd.DataFrame({"a": [10, 11, 12, 13, 14, 1000]})
    result = detect_outliers_iqr(df)
    assert result["a"]["outlier_count"] == 1
    assert 1000 in result["a"]["sample_outlier_values"]


def test_insufficient_data_flagged():
    df = pd.DataFrame({"a": [1, 2]})
    result = detect_outliers_iqr(df)
    assert result["a"]["insufficient_data"] is True
    assert result["a"]["outlier_count"] == 0


def test_zero_iqr_no_crash():
    df = pd.DataFrame({"a": [5, 5, 5, 5, 5, 100]})
    # Q1 == Q3 == 5, IQR == 0; must not raise a division error and must not
    # explode the outlier bound to reject everything unpredictably.
    result = detect_outliers_iqr(df)
    assert "a" in result


def test_ignores_non_numeric_columns():
    df = pd.DataFrame({"a": [1, 2, 3, 4, 5], "b": ["x", "y", "z", "w", "v"]})
    result = detect_outliers_iqr(df)
    assert "b" not in result
