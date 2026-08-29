export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type DatasetStatus =
  | "uploaded"
  | "validating"
  | "valid"
  | "invalid"
  | "analyzing"
  | "analyzed"
  | "failed";

export interface Dataset {
  id: number;
  name: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  status: DatasetStatus;
  validation_error: string | null;
  row_count: number | null;
  column_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface DatasetListResponse {
  items: Dataset[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DatasetColumn {
  name: string;
  position: number;
  detected_type: string;
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  is_constant: boolean;
  extra_stats: Record<string, unknown>;
}

export interface DatasetPreview {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  previewed_rows: number;
}

export interface QualityIssue {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
  penalty: number;
}

export interface NumericalStatEntry {
  count: number;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  max?: number | null;
  q1?: number | null;
  median?: number | null;
  q3?: number | null;
  skewness?: number | null;
  kurtosis?: number | null;
  zero_count?: number;
  negative_count?: number;
}

export interface CategoricalTopValue {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoricalStatEntry {
  count: number;
  unique_count?: number;
  top_values: CategoricalTopValue[];
}

export interface OutlierEntry {
  outlier_count: number;
  outlier_percentage: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  sample_outlier_values?: number[];
  insufficient_data: boolean;
}

export interface CorrelationResult {
  available: boolean;
  reason: string | null;
  columns: string[];
  matrix: Record<string, Record<string, number | null>>;
  strong_pairs?: { column_a: string; column_b: string; correlation: number }[];
}

export interface ProfilingColumn {
  name: string;
  position: number;
  detected_type: string;
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  is_constant: boolean;
  sample_values: unknown[];
}

export interface ProfilingResult {
  row_count: number;
  column_count: number;
  duplicate_row_count: number;
  duplicate_row_percentage: number;
  columns: ProfilingColumn[];
}

export interface QualityReport {
  id: number;
  dataset_id: number;
  quality_score: number;
  profiling_result: ProfilingResult;
  quality_issues: QualityIssue[];
  numerical_stats: Record<string, NumericalStatEntry>;
  categorical_stats: Record<string, CategoricalStatEntry>;
  outliers: Record<string, OutlierEntry>;
  correlation: CorrelationResult;
  created_at: string;
}

export interface QualityReportSummary {
  id: number;
  dataset_id: number;
  quality_score: number;
  created_at: string;
  issue_count: number;
}

export interface ReportHistoryResponse {
  items: QualityReportSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ReportComparisonResponse {
  report_a: QualityReport;
  report_b: QualityReport;
  score_delta: number;
  improved: boolean;
  new_issues: QualityIssue[];
  resolved_issues: QualityIssue[];
}

export interface ApiError {
  error_code: string;
  message: string;
}
