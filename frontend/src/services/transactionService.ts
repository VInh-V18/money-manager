import api from "@/lib/axios";
import type { Transaction, PaginatedResult } from "@/types";

export interface ListTxQuery {
  page?: number;
  limit?: number;
  type?: "income" | "expense";
  walletId?: number;
  categoryId?: number;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: "transactionDate" | "createdAt" | "amount";
  sortDir?: "asc" | "desc";
}

export const transactionService = {
  list: (query: ListTxQuery = {}) =>
    api
      .get("/transactions", { params: query })
      .then((r) => r.data.data as PaginatedResult<Transaction>),

  recent: (limit = 10) =>
    api
      .get("/transactions/recent", { params: { limit } })
      .then((r) => r.data.data.items as Transaction[]),

  search: (q: string) =>
    api
      .get("/transactions/search", { params: { q } })
      .then((r) => r.data.data.items as Transaction[]),

  get: (id: number) =>
    api.get(`/transactions/${id}`).then((r) => r.data.data.transaction as Transaction),

  create: (data: {
    walletId: number;
    categoryId?: number | null;
    type: "income" | "expense";
    subType?: string;
    amount: number;
    description?: string;
    note?: string;
    transactionDate: string;
    transactionTime?: string;
    allowNegative?: boolean;
  }) =>
    api.post("/transactions", data).then((r) => r.data.data.transaction as Transaction),

  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/transactions/${id}`, data).then((r) => r.data.data.transaction as Transaction),

  remove: (id: number) => api.delete(`/transactions/${id}`).then((r) => r.data),

  createDailyWage: (data: {
    walletId: number;
    categoryId?: number;
    dailyRate: number;
    numberOfDays: number;
    startDate: string;
    description?: string;
  }) =>
    api.post("/transactions/daily-wage", data).then((r) => r.data.data.transaction),

  createHourlyWage: (data: {
    walletId: number;
    categoryId?: number;
    hourlyRate: number;
    numberOfHours: number;
    workDate: string;
    shift?: string;
    description?: string;
  }) =>
    api.post("/transactions/hourly-wage", data).then((r) => r.data.data.transaction),
};
