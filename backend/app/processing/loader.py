"""Loads CSV/Excel files into pandas DataFrames with defensive validation.

Kept free of any FastAPI/DB imports so it can be unit tested with plain files.
"""
from __future__ import annotations

import pandas as pd


class DatasetLoadError(Exception):
    pass


SUPPORTED_EXTENSIONS = {"csv", "xlsx", "xls"}


def load_dataframe(file_path: str, file_type: str) -> pd.DataFrame:
    file_type = file_type.lower().lstrip(".")
    if file_type not in SUPPORTED_EXTENSIONS:
        raise DatasetLoadError(f"Unsupported file type: {file_type}")

    try:
        if file_type == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
    except pd.errors.EmptyDataError as exc:
        raise DatasetLoadError("The file is empty.") from exc
    except Exception as exc:  # noqa: BLE001 - surfaced as a controlled load error
        raise DatasetLoadError(f"Could not parse file: {exc}") from exc

    if df.shape[1] == 0:
        raise DatasetLoadError("The file has no columns.")
    if df.shape[0] == 0:
        raise DatasetLoadError("The file has no data rows.")

    # Normalize duplicate/blank column names so downstream code never indexes ambiguously.
    df.columns = _dedupe_columns([str(c).strip() or f"column_{i}" for i, c in enumerate(df.columns)])
    return df


def _dedupe_columns(columns: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    result = []
    for col in columns:
        if col not in seen:
            seen[col] = 0
            result.append(col)
        else:
            seen[col] += 1
            result.append(f"{col}_{seen[col]}")
    return result
