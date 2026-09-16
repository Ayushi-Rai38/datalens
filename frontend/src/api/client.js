import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({ baseURL: BASE_URL });

const ACCESS_TOKEN_KEY = "datalens_access_token";
const REFRESH_TOKEN_KEY = "datalens_refresh_token";

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (tokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight = null;

async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const resp = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
      refresh_token: refreshToken,
    });
    tokenStorage.setTokens(resp.data);
    return resp.data.access_token;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      refreshInFlight ??= refreshAccessToken();
      const newToken = await refreshInFlight;
      refreshInFlight = null;

      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
      tokenStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return `Network Error: Unable to connect to backend at ${BASE_URL}. Please ensure backend is running at http://127.0.0.1:8000.`;
    }
    const data = error.response.data;
    if (data?.message) return data.message;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail.map((d) => d.msg).join(", ");
    }
    return error.message || "Something went wrong.";
  }
  return "Something went wrong.";
}
