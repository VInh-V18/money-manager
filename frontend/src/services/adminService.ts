import api from "@/lib/axios";
import type { ActivityLog, Feedback, PaginatedResult, User } from "@/types";

export interface AdminDashboard {
  totalUsers: number;
  newUsersToday: number;
  totalTransactions: number;
  totalWallets: number;
  openFeedback: number;
  failedLoginsToday: number;
}

export interface AdminUserGrowth {
  date: string;
  count: number | string;
}

export const adminService = {
  dashboard: () => api.get("/admin/dashboard").then((r) => r.data.data as AdminDashboard),

  userGrowth: () =>
    api.get("/admin/user-growth").then((r) => r.data.data.items as AdminUserGrowth[]),

  users: (page = 1, limit = 20, q = "", role = "") =>
    api
      .get("/admin/users", { params: { page, limit, q: q || undefined, role: role || undefined } })
      .then((r) => r.data.data as PaginatedResult<User>),

  updateUserRole: (id: number, role: User["role"]) =>
    api
      .put(`/admin/users/${id}/role`, { role })
      .then((r) => r.data.data.user as User),

  feedback: (page = 1, limit = 20) =>
    api
      .get("/admin/feedback", { params: { page, limit } })
      .then((r) => r.data.data as PaginatedResult<Feedback>),

  updateFeedbackStatus: (id: number, status: Feedback["status"]) =>
    api
      .put(`/admin/feedback/${id}/status`, { status })
      .then((r) => r.data.data.feedback as Feedback),

  systemLogs: (page = 1, limit = 20) =>
    api
      .get("/admin/system-logs", { params: { page, limit } })
      .then((r) => r.data.data as PaginatedResult<ActivityLog>),
};
