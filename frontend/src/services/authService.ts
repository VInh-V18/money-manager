import api from "@/lib/axios";
import { API_BASE_URL } from "@/lib/env";
import type { ActivityLog, AuthSession, LoginHistory, PaginatedResult, User } from "@/types";

export type OAuthProvider = "google" | "facebook" | "github";

export const authService = {
  signUp: (data: { username: string; email: string; password: string; displayName: string }) =>
    api.post("/auth/signup", data).then((r) => r.data.data),

  signIn: (identifier: string, password: string) =>
    api.post("/auth/signin", { identifier, password }).then((r) => r.data.data as { user: User; accessToken: string }),

  signOut: () => api.post("/auth/signout").then((r) => r.data),

  refresh: () => api.post("/auth/refresh").then((r) => r.data.data as { accessToken: string }),

  oauthUrl: (provider: OAuthProvider) => `${API_BASE_URL}/auth/oauth/${provider}`,

  fetchMe: () => api.get("/auth/me").then((r) => r.data.data.user as User),

  verifyEmail: (email: string, code: string) =>
    api.post("/auth/verify-email", { email, code }).then((r) => r.data),

  resendVerifyOtp: (email: string) =>
    api.post("/auth/resend-verify-otp", { email }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }).then((r) => r.data as {
      success: boolean;
      message: string;
      data?: { sent?: boolean };
    }),

  verifyResetOtp: (email: string, code: string) =>
    api.post("/auth/verify-reset-otp", { email, code }).then((r) => r.data.data as { resetToken: string }),

  resetPassword: (data: { email: string; resetToken: string; newPassword: string }) =>
    api.post("/auth/reset-password", data).then((r) => r.data),

  updateProfile: (data: Partial<Pick<User, "displayName" | "bio" | "phone" | "defaultCurrency" | "timezone">>) =>
    api.put("/auth/profile", data).then((r) => r.data.data.user as User),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put("/auth/change-password", { currentPassword, newPassword }).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return api
      .post("/auth/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data as { avatarUrl: string });
  },

  sessions: () =>
    api.get("/auth/sessions").then((r) => r.data.data.items as AuthSession[]),

  revokeSession: (id: number) =>
    api.delete(`/auth/sessions/${id}`).then((r) => r.data.data as { revokedCurrent: boolean }),

  revokeOtherSessions: () =>
    api.delete("/auth/sessions/others").then((r) => r.data.data as { revokedCount: number }),

  loginHistory: (page = 1, limit = 10, status?: LoginHistory["status"]) =>
    api
      .get("/auth/login-history", { params: { page, limit, status } })
      .then((r) => r.data.data as PaginatedResult<LoginHistory>),

  activityLogs: (page = 1, limit = 10) =>
    api
      .get("/auth/activity-logs", { params: { page, limit } })
      .then((r) => r.data.data as PaginatedResult<ActivityLog>),
};
