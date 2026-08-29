from app.processing.outliers import detect_outliers_iqr
from app.processing.profiling import profile_dataset
from app.processing.quality_score import compute_quality_score


def test_clean_dataset_scores_high(clean_df):
    profiling = profile_dataset(clean_df)
    outliers = detect_outliers_iqr(clean_df)
    score, issues = compute_quality_score(profiling, outliers)
    assert score == 100.0
    assert issues == []


def test_messy_dataset_scores_lower_and_lists_issues(messy_df):
    profiling = profile_dataset(messy_df)
    outliers = detect_outliers_iqr(messy_df)
    score, issues = compute_quality_score(profiling, outliers)
    assert score < 100.0
    codes = {i["code"] for i in issues}
    assert "constant_columns" in codes
    assert "missing_values" in codes


def test_score_never_negative():
    import pandas as pd
    df = pd.DataFrame({
        "a": [None] * 19 + [1],
        "b": ["x"] * 20,
    })
    profiling = profile_dataset(df)
    outliers = detect_outliers_iqr(df)
    score, _ = compute_quality_score(profiling, outliers)
    assert 0.0 <= score <= 100.0
