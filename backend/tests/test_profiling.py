import pandas as pd

from app.processing.profiling import profile_dataset


def test_profile_clean_dataset(clean_df):
    result = profile_dataset(clean_df)
    assert result["row_count"] == 10
    assert result["column_count"] == 3
    assert result["duplicate_row_count"] == 0

    col_names = [c["name"] for c in result["columns"]]
    assert col_names == ["id", "age", "category"]
    assert all(c["missing_count"] == 0 for c in result["columns"])


def test_profile_detects_missing_values(messy_df):
    result = profile_dataset(messy_df)
    value_col = next(c for c in result["columns"] if c["name"] == "value")
    assert value_col["missing_count"] == 2
    assert value_col["missing_percentage"] == 20.0


def test_profile_detects_constant_column(messy_df):
    result = profile_dataset(messy_df)
    constant_col = next(c for c in result["columns"] if c["name"] == "constant_col")
    assert constant_col["is_constant"] is True
    assert constant_col["unique_count"] == 1


def test_profile_detects_duplicate_rows():
    df = pd.DataFrame({"a": [1, 1, 2], "b": ["x", "x", "y"]})
    result = profile_dataset(df)
    assert result["duplicate_row_count"] == 1


def test_profile_handles_all_null_column():
    df = pd.DataFrame({"a": [1, 2, 3], "all_null": [None, None, None]})
    result = profile_dataset(df)
    col = next(c for c in result["columns"] if c["name"] == "all_null")
    assert col["missing_percentage"] == 100.0
    assert col["unique_count"] == 0
    # A fully-null column has zero non-null values, so it is not flagged as "constant".
    assert col["is_constant"] is False
