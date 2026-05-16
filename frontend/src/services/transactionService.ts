import api from "@/lib/axios";
import { notifyTransactionsChanged } from "@/lib/realtime";
import type { Transaction, PaginatedResult } from "@/types";

const emptyPage: PaginatedResult<Transaction> = {
  items: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const asTransactions = (value: unknown): Transaction[] =>
  Array.isArray(value) ? (value as Transaction[]) : [];

const makeIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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
      .then((r) => {
        const data = r.data?.data;
        return {
          ...emptyPage,
          ...data,
          items: asTransactions(data?.items),
          pagination: data?.pagination || emptyPage.pagination,
        };
      }),

  recent: (limit = 10) =>
    api
      .get("/transactions/recent", { params: { limit } })
      .then((r) => asTransactions(r.data?.data?.items)),

  trash: (page = 1, limit = 20) =>
    api
      .get("/transactions/trash", { params: { page, limit } })
      .then((r) => {
        const data = r.data?.data;
        return {
          ...emptyPage,
          ...data,
          items: asTransactions(data?.items),
          pagination: data?.pagination || emptyPage.pagination,
        };
      }),

  search: (q: string) =>
    api
      .get("/transactions/search", { params: { q } })
      .then((r) => asTransactions(r.data?.data?.items)),

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
    transactionTime?: string | null;
    receiptUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    allowNegative?: boolean;
    idempotencyKey?: string;
  }) =>
    api.post("/transactions", {
      ...data,
      idempotencyKey: data.idempotencyKey || makeIdempotencyKey(),
    }).then((r) => {
      const transaction = r.data.data.transaction as Transaction;
      notifyTransactionsChanged({ action: "create", ids: [transaction.id] });
      return transaction;
    }),

  uploadReceipt: (file: File) => {
    const fd = new FormData();
    fd.append("receipt", file);
    return api
      .post("/transactions/receipt", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data.receiptUrl as string);
  },

  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/transactions/${id}`, data).then((r) => {
      const transaction = r.data.data.transaction as Transaction;
      notifyTransactionsChanged({ action: "update", ids: [transaction.id] });
      return transaction;
    }),

  remove: (id: number) =>
    api.delete(`/transactions/${id}`).then((r) => {
      notifyTransactionsChanged({ action: "delete", ids: [id] });
      return r.data;
    }),

  removeMany: (ids: number[]) =>
    api.delete("/transactions/bulk", { data: { ids } }).then((r) => {
      notifyTransactionsChanged({ action: "bulk-delete", ids });
      return r.data;
    }),

  restore: (id: number) =>
    api.post(`/transactions/${id}/restore`).then((r) => {
      const transaction = r.data.data.transaction as Transaction;
      notifyTransactionsChanged({ action: "restore", ids: [transaction.id] });
      return transaction;
    }),

  createDailyWage: (data: {
    walletId: number;
    categoryId?: number;
    dailyRate: number;
    numberOfDays: number;
    startDate: string;
    description?: string;
  }) =>
    api.post("/transactions/daily-wage", data).then((r) => {
      const transaction = r.data.data.transaction as Transaction;
      notifyTransactionsChanged({ action: "create", ids: [transaction.id] });
      return transaction;
    }),

  createHourlyWage: (data: {
    walletId: number;
    categoryId?: number;
    hourlyRate: number;
    numberOfHours: number;
    workDate: string;
    shift?: string;
    description?: string;
  }) =>
    api.post("/transactions/hourly-wage", data).then((r) => {
      const transaction = r.data.data.transaction as Transaction;
      notifyTransactionsChanged({ action: "create", ids: [transaction.id] });
      return transaction;
    }),
};
