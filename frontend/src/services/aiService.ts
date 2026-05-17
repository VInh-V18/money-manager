import api from "@/lib/axios";
import { notifyTransactionsChanged } from "@/lib/realtime";

export type AiMode = "advisor" | "forecast" | "risk" | "budget" | "transaction_parser";
export type AiChatRole = "user" | "assistant";

export interface AiChatResponse {
  answer: string;
  mode: AiMode;
  model: string;
  sessionId: number | null;
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

export interface AiChatSession {
  id: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: number;
  sessionId: number;
  role: AiChatRole;
  content: string;
  createdAt: string;
}

export interface AiChatSessionDetail {
  session: AiChatSession;
  messages: AiChatMessage[];
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

export interface AiReceiptOcrResponse {
  type: "income" | "expense";
  amount: number;
  description: string;
  transactionDate: string;
  note: string;
  categoryName: string;
}

export interface AiClassificationResponse {
  type: "income" | "expense";
  category: { id: number; name: string; type: "income" | "expense"; icon: string; color: string } | null;
  confidence: number;
  reason: string;
}

export const aiService = {
  context: () => api.get("/ai/context").then((r) => r.data.data as AiFinancialContext),
  chat: (message: string, mode: AiMode = "advisor", sessionId?: number | null) =>
    api.post("/ai/chat", { message, mode, sessionId: sessionId ?? null }).then((r) => r.data.data as AiChatResponse),

  // Chat session management
  listSessions: (page = 1, limit = 20) =>
    api.get("/ai/sessions", { params: { page, limit } }).then((r) => r.data.data as { total: number; page: number; items: AiChatSession[] }),
  getSession: (id: number) =>
    api.get(`/ai/sessions/${id}`).then((r) => r.data.data as AiChatSessionDetail),
  deleteSession: (id: number) =>
    api.delete(`/ai/sessions/${id}`).then((r) => r.data.data as { deleted: boolean }),
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
  scanReceipt: (file: File) => {
    const form = new FormData();
    form.append("receipt", file);
    return api.post("/transactions/receipt/ocr", form).then((r) => r.data.data as AiReceiptOcrResponse);
  },
};
