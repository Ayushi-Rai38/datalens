import pandas as pd
import pytest

from app.processing.loader import DatasetLoadError, load_dataframe


def test_load_valid_csv(tmp_path):
    path = tmp_path / "data.csv"
    pd.DataFrame({"a": [1, 2], "b": [3, 4]}).to_csv(path, index=False)
    df = load_dataframe(str(path), "csv")
    assert df.shape == (2, 2)


def test_empty_file_raises(tmp_path):
    path = tmp_path / "empty.csv"
    path.write_text("")
    with pytest.raises(DatasetLoadError):
        load_dataframe(str(path), "csv")


def test_header_only_csv_raises(tmp_path):
    path = tmp_path / "headers.csv"
    path.write_text("a,b,c\n")
    with pytest.raises(DatasetLoadError):
        load_dataframe(str(path), "csv")


def test_unsupported_extension_raises(tmp_path):
    path = tmp_path / "data.txt"
    path.write_text("a,b\n1,2\n")
    with pytest.raises(DatasetLoadError):
        load_dataframe(str(path), "txt")


def test_duplicate_column_names_deduped(tmp_path):
    path = tmp_path / "dupes.csv"
    path.write_text("a,a,b\n1,2,3\n4,5,6\n")
    df = load_dataframe(str(path), "csv")
    assert list(df.columns) == ["a", "a_1", "b"]
