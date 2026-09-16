import { apiClient } from "./client";

export const authApi = {
  register: (email, password, full_name) =>
    apiClient.post("/api/v1/auth/register", { email, password, full_name }),

  login: (email, password) =>
    apiClient.post("/api/v1/auth/login", { email, password }),

  me: () => apiClient.get("/api/v1/auth/me"),
};

export const datasetApi = {
  upload: (file, name, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);
    return apiClient.post("/api/v1/datasets", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },

  list: (params) => apiClient.get("/api/v1/datasets", { params }),

  get: (id) => apiClient.get(`/api/v1/datasets/${id}`),

  remove: (id) => apiClient.delete(`/api/v1/datasets/${id}`),

  columns: (id) => apiClient.get(`/api/v1/datasets/${id}/columns`),

  preview: (id, limit = 50) =>
    apiClient.get(`/api/v1/datasets/${id}/preview`, { params: { limit } }),
};

export const analysisApi = {
  run: (datasetId) => apiClient.post(`/api/v1/analysis/${datasetId}/run`),

  latest: (datasetId) => apiClient.get(`/api/v1/analysis/${datasetId}/latest`),

  history: (datasetId, page = 1, page_size = 10) =>
    apiClient.get(`/api/v1/analysis/${datasetId}/history`, {
      params: { page, page_size },
    }),

  compare: (reportA, reportB) =>
    apiClient.get("/api/v1/analysis/reports/compare", {
      params: { report_a: reportA, report_b: reportB },
    }),
};
