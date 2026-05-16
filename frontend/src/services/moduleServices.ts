import api from "@/lib/axios";
import type {
  Budget,
  BudgetSummary,
  FixedExpense,
  Goal,
  Debt,
  ExpenseTemplate,
  Notification,
  NotificationPreference,
  PaginatedResult,
  Transaction,
} from "@/types";

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// ===== Budget =====
export const budgetService = {
  list: () =>
    api
      .get("/budgets")
      .then((r) => asArray<Budget>(r.data?.data?.items ?? r.data?.data?.budgets)),
  summary: () => api.get("/budgets/summary").then((r) => r.data.data as BudgetSummary),
  get: (id: number) => api.get(`/budgets/${id}`).then((r) => r.data.data.budget as Budget),
  create: (data: Partial<Budget>) =>
    api.post("/budgets", data).then((r) => r.data.data.budget as Budget),
  update: (id: number, data: Partial<Budget>) =>
    api.put(`/budgets/${id}`, data).then((r) => r.data.data.budget as Budget),
  remove: (id: number) => api.delete(`/budgets/${id}`).then((r) => r.data),
};

// ===== FixedExpense =====
export const fixedExpenseService = {
  list: () =>
    api.get("/fixed-expenses").then((r) => asArray<FixedExpense>(r.data?.data?.items)),
  get: (id: number) =>
    api.get(`/fixed-expenses/${id}`).then((r) => r.data.data.fixedExpense as FixedExpense),
  create: (data: Partial<FixedExpense>) =>
    api.post("/fixed-expenses", data).then((r) => r.data.data.fixedExpense as FixedExpense),
  update: (id: number, data: Partial<FixedExpense>) =>
    api.put(`/fixed-expenses/${id}`, data).then((r) => r.data.data.fixedExpense as FixedExpense),
  remove: (id: number) => api.delete(`/fixed-expenses/${id}`).then((r) => r.data),
  generateDue: () =>
    api.post("/fixed-expenses/generate-due").then((r) => r.data.data),
};

// ===== Goal =====
export const goalService = {
  list: () => api.get("/goals").then((r) => asArray<Goal>(r.data?.data?.items)),
  get: (id: number) => api.get(`/goals/${id}`).then((r) => r.data.data.goal as Goal),
  create: (data: Partial<Goal>) =>
    api.post("/goals", data).then((r) => r.data.data.goal as Goal),
  update: (id: number, data: Partial<Goal>) =>
    api.put(`/goals/${id}`, data).then((r) => r.data.data.goal as Goal),
  remove: (id: number) => api.delete(`/goals/${id}`).then((r) => r.data),
  addToGoal: (id: number, amount: number, note?: string) =>
    api.post(`/goals/${id}/add`, { amount, note }).then((r) => r.data.data),
  withdrawFromGoal: (id: number, amount: number) =>
    api.post(`/goals/${id}/withdraw`, { amount }).then((r) => r.data.data),
};

// ===== Debt =====
export const debtService = {
  list: () => api.get("/debts").then((r) => asArray<Debt>(r.data?.data?.items)),
  get: (id: number) => api.get(`/debts/${id}`).then((r) => r.data.data.debt as Debt),
  create: (data: Partial<Debt>) =>
    api.post("/debts", data).then((r) => r.data.data.debt as Debt),
  update: (id: number, data: Partial<Debt>) =>
    api.put(`/debts/${id}`, data).then((r) => r.data.data.debt as Debt),
  remove: (id: number) => api.delete(`/debts/${id}`).then((r) => r.data),
  pay: (
    id: number,
    data: { amount: number; walletId?: number | null; payDate: string; note?: string }
  ) => api.post(`/debts/${id}/pay`, data).then((r) => r.data.data),
};

// ===== Template =====
export const templateService = {
  list: () =>
    api.get("/templates").then((r) => asArray<ExpenseTemplate>(r.data?.data?.items)),
  get: (id: number) =>
    api.get(`/templates/${id}`).then((r) => r.data.data.template as ExpenseTemplate),
  create: (data: Partial<ExpenseTemplate>) =>
    api.post("/templates", data).then((r) => r.data.data.template as ExpenseTemplate),
  update: (id: number, data: Partial<ExpenseTemplate>) =>
    api.put(`/templates/${id}`, data).then((r) => r.data.data.template as ExpenseTemplate),
  remove: (id: number) => api.delete(`/templates/${id}`).then((r) => r.data),
  use: (id: number, data: { walletId?: number; amount?: number; description?: string; transactionDate?: string }) =>
    api.post(`/templates/${id}/use`, data).then((r) => r.data.data.transaction as Transaction),
};

// ===== Notification =====
export const notificationService = {
  list: (page = 1, limit = 20, unread = false) =>
    api
      .get("/notifications", { params: { page, limit, unread } })
      .then((r) => r.data.data as PaginatedResult<Notification> & { unreadCount: number }),
  unreadCount: () =>
    api.get("/notifications/unread-count").then((r) => r.data.data.unreadCount as number),
  markRead: (id: number) =>
    api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put("/notifications/mark-all-read").then((r) => r.data),
  remove: (id: number) => api.delete(`/notifications/${id}`).then((r) => r.data),
  removeAllRead: () => api.delete("/notifications/read-all").then((r) => r.data),
  preferences: () =>
    api.get("/notifications/preferences").then((r) => r.data.data.preferences as NotificationPreference),
  updatePreferences: (data: Partial<NotificationPreference>) =>
    api
      .put("/notifications/preferences", data)
      .then((r) => r.data.data.preferences as NotificationPreference),
};
