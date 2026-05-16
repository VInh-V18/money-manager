import api from "@/lib/axios";
import { notifyTransactionsChanged } from "@/lib/realtime";

export type AiMode = "advisor" | "forecast" | "risk" | "budget" | "transaction_parser";
export type AiChatRole = "user" | "assistant";

export interface AiChatHistoryItem {
  role: AiChatRole;
  content: string;
}

export interface AiChatResponse {
  answer: string;
  mode: AiMode;
  model: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  } | null;
  contextSnapshot?: {
    generatedAt: string;
    totalBalance: number;
    last30Days: {
      income: number;
      expense: number;
      net: number;
      transactionCount: number;
    };
  };
}

export interface AiFinancialContext {
  generatedAt: string;
  totals: {
    totalBalance: number;
    cashflow30: { income: number; expense: number; net: number; transactionCount: number };
    cashflow90: { income: number; expense: number; net: number; transactionCount: number };
  };
  wallets: Array<{ id: number; name: string; balance: number; type: string }>;
  budgets: Array<{ id: number; name: string; amount: number; spent: number; remaining: number; usedPercent: number }>;
  debts: Array<{ id: number; personName: string; type: string; amount: number; paidAmount: number; remaining: number; status: string }>;
  goals: Array<{ id: number; name: string; targetAmount: number; currentAmount: number; remaining: number; status: string }>;
}

export interface AiNaturalTransactionResponse {
  transaction: unknown;
  parsed: {
    amount: number;
    type: "income" | "expense";
    transactionDate: string;
    wallet?: { id: number; name: string };
    category?: { id: number; name: string } | null;
    confidence: number;
  };
}

export interface AiSpendingTotalResponse {
  fromDate: string;
  toDate: string;
  total: number;
  count: number;
}

export interface AiClassificationResponse {
  type: "income" | "expense";
  category: { id: number; name: string; type: "income" | "expense"; icon: string; color: string } | null;
  confidence: number;
  reason: string;
}

export const aiService = {
  context: () => api.get("/ai/context").then((r) => r.data.data as AiFinancialContext),
  chat: (message: string, mode: AiMode, history: AiChatHistoryItem[] = []) =>
    api.post("/ai/chat", { message, mode, history }).then((r) => r.data.data as AiChatResponse),
  classify: (text: string, type?: "income" | "expense") =>
    api.post("/ai/classify", { text, type }).then((r) => r.data.data as AiClassificationResponse),
  naturalTransaction: (text: string) =>
    api
      .post("/ai/natural-transaction", { text })
      .then((r) => {
        const data = r.data.data as AiNaturalTransactionResponse;
        const id = typeof data.transaction === "object" && data.transaction !== null && "id" in data.transaction
          ? Number((data.transaction as { id: unknown }).id)
          : undefined;
        notifyTransactionsChanged({ action: "create", ids: id ? [id] : undefined });
        return data;
      }),
  spendingTotal: () =>
    api.get("/ai/spending-total").then((r) => r.data.data as AiSpendingTotalResponse),
  monthlyAnalysis: () => api.get("/ai/monthly-analysis").then((r) => r.data.data as AiChatResponse),
  savings: () => api.get("/ai/savings").then((r) => r.data.data as AiChatResponse),
  report: () => api.get("/ai/report").then((r) => r.data.data as AiChatResponse),
};
