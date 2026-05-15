import api from "@/lib/axios";
import { notifyWalletsChanged } from "@/lib/realtime";
import type { Wallet, Category, PaginatedResult, Transaction, WalletBalanceHistory } from "@/types";

export const walletService = {
  list: () =>
    api.get("/wallets").then((r) => r.data.data as { wallets: Wallet[]; totalBalance: number }),

  get: (id: number) =>
    api.get(`/wallets/${id}`).then((r) => r.data.data.wallet as Wallet),

  create: (data: Partial<Wallet>) =>
    api.post("/wallets", data).then((r) => {
      const wallet = r.data.data.wallet as Wallet;
      notifyWalletsChanged({ action: "create", ids: [wallet.id] });
      return wallet;
    }),

  update: (id: number, data: Partial<Wallet>) =>
    api.put(`/wallets/${id}`, data).then((r) => {
      const wallet = r.data.data.wallet as Wallet;
      notifyWalletsChanged({ action: "update", ids: [wallet.id] });
      return wallet;
    }),

  remove: (id: number) =>
    api.delete(`/wallets/${id}`).then((r) => {
      notifyWalletsChanged({ action: "delete", ids: [id] });
      return r.data;
    }),

  transfer: (data: {
    fromWalletId: number;
    toWalletId: number;
    amount: number;
    fee?: number;
    transferDate: string;
    note?: string;
  }) => api.post("/wallets/transfer", data).then((r) => {
    notifyWalletsChanged({ action: "transfer", ids: [data.fromWalletId, data.toWalletId] });
    return r.data.data;
  }),

  history: (id: number, page = 1, limit = 20) =>
    api
      .get(`/wallets/${id}/history`, { params: { page, limit } })
      .then((r) => r.data.data as PaginatedResult<Transaction>),

  balanceHistory: (id: number, page = 1, limit = 20) =>
    api
      .get(`/wallets/${id}/balance-history`, { params: { page, limit } })
      .then((r) => r.data.data as PaginatedResult<WalletBalanceHistory>),
};

export const categoryService = {
  list: (type?: "income" | "expense") =>
    api
      .get("/categories", { params: type ? { type } : {} })
      .then((r) => r.data.data.categories as Category[]),

  get: (id: number) =>
    api.get(`/categories/${id}`).then((r) => r.data.data.category as Category),

  create: (data: Partial<Category>) =>
    api.post("/categories", data).then((r) => r.data.data.category as Category),

  update: (id: number, data: Partial<Category>) =>
    api.put(`/categories/${id}`, data).then((r) => r.data.data.category as Category),

  remove: (id: number) => api.delete(`/categories/${id}`).then((r) => r.data),
};
