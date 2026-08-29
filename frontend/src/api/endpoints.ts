import { apiClient } from "./client";
import type {
  Dataset,
  DatasetColumn,
  DatasetListResponse,
  DatasetPreview,
  DatasetStatus,
  QualityReport,
  ReportComparisonResponse,
  ReportHistoryResponse,
  TokenPair,
  User,
} from "../types";

export const authApi = {
  register: (email: string, password: string, full_name?: string) =>
    apiClient.post<User>("/api/v1/auth/register", { email, password, full_name }),

  login: (email: string, password: string) =>
    apiClient.post<TokenPair>("/api/v1/auth/login", { email, password }),

  me: () => apiClient.get<User>("/api/v1/auth/me"),
};

export const datasetApi = {
  upload: (file: File, name?: string, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);
    return apiClient.post<Dataset>("/api/v1/datasets", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },

  list: (params: { page?: number; page_size?: number; search?: string; status?: DatasetStatus }) =>
    apiClient.get<DatasetListResponse>("/api/v1/datasets", { params }),

  get: (id: number) => apiClient.get<Dataset>(`/api/v1/datasets/${id}`),

  remove: (id: number) => apiClient.delete(`/api/v1/datasets/${id}`),

  columns: (id: number) => apiClient.get<DatasetColumn[]>(`/api/v1/datasets/${id}/columns`),

  preview: (id: number, limit = 50) =>
    apiClient.get<DatasetPreview>(`/api/v1/datasets/${id}/preview`, { params: { limit } }),
};

export const analysisApi = {
  run: (datasetId: number) => apiClient.post<QualityReport>(`/api/v1/analysis/${datasetId}/run`),

  latest: (datasetId: number) => apiClient.get<QualityReport>(`/api/v1/analysis/${datasetId}/latest`),

  history: (datasetId: number, page = 1, page_size = 10) =>
    apiClient.get<ReportHistoryResponse>(`/api/v1/analysis/${datasetId}/history`, {
      params: { page, page_size },
    }),

  compare: (reportA: number, reportB: number) =>
    apiClient.get<ReportComparisonResponse>("/api/v1/analysis/reports/compare", {
      params: { report_a: reportA, report_b: reportB },
    }),
};
