import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/useAuthStore";

const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api",
  withCredentials: true,
});

// Gắn access token vào header
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Tự động refresh khi access token hết hạn
type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    if (!originalRequest) return Promise.reject(error);

    // Bypass cho route auth công khai
    const url = originalRequest.url || "";
    if (
      url.includes("/auth/signin") ||
      url.includes("/auth/signup") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/verify-email") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password")
    ) {
      return Promise.reject(error);
    }

    // Backend mới trả 401 (chứ không phải 403 như Moji)
    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true;
      try {
        const res = await api.post("/auth/refresh");
        const newToken = res.data?.data?.accessToken;
        if (!newToken) throw new Error("No access token in refresh response");

        useAuthStore.getState().setAccessToken(newToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        useAuthStore.getState().clearState();
        // chuyển về trang sign in
        if (window.location.pathname !== "/signin") {
          window.location.href = "/signin";
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

/** Helper extract message lỗi từ response */
export const getErrorMessage = (err: unknown, fallback = "Có lỗi xảy ra"): string => {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string; errors?: unknown };
    return data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};

export default api;
