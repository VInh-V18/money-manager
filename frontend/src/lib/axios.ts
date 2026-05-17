import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { API_BASE_URL } from "@/lib/env";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Gắn access token vào header.
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Shared promise so concurrent 401 responses share a single refresh call
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    if (!originalRequest) return Promise.reject(error);

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

    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true;

      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh")
          .then((res) => {
            const newToken = res.data?.data?.accessToken;
            if (!newToken) throw new Error("No access token in refresh response");
            useAuthStore.getState().setAccessToken(newToken);
            return newToken as string;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        const newToken = await refreshPromise;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch {
        useAuthStore.getState().clearState();
        if (window.location.pathname !== "/signin") {
          window.location.href = "/signin";
        }
        // Return pending promise so in-flight requests don't trigger error toasts before redirect
        return new Promise(() => {});
      }
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (err: unknown, fallback = "Có lỗi xảy ra"): string => {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string; errors?: unknown };
    return data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};

export default api;
