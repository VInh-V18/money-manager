import { z } from "zod";

// ===== FinancialGoal =====
export const createGoalSchema = z.object({
  walletId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(150),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).default(0),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  icon: z.string().max(50).default("target"),
  color: z.string().max(20).default("#A855F7"),
  note: z.string().max(500).optional().nullable(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(["active", "completed", "cancelled"]).optional(),
});

export const addToGoalSchema = z.object({
  amount: z.coerce.number().positive(),
});

export const withdrawFromGoalSchema = z.object({
  amount: z.coerce.number().positive(),
});

// ===== Debt =====
export const createDebtSchema = z.object({
  walletId: z.coerce.number().int().positive().optional().nullable(),
  type: z.enum(["owed_by_me", "owed_to_me"]),
  personName: z.string().min(1).max(150),
  personPhone: z.string().max(20).optional().nullable(),
  amount: z.coerce.number().positive(),
  paidAmount: z.coerce.number().min(0).default(0),
  borrowedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const updateDebtSchema = createDebtSchema.partial();

export const payDebtSchema = z.object({
  amount: z.coerce.number().positive(),
  // co tao giao dich tuong ung trong vi khong
  walletId: z.coerce.number().int().positive().optional().nullable(),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});

// ===== ExpenseTemplate =====
export const createTemplateSchema = z.object({
  walletId: z.coerce.number().int().positive().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(100),
  defaultAmount: z.coerce.number().min(0).optional().nullable(),
  type: z.enum(["income", "expense"]).default("expense"),
  icon: z.string().max(50).default("zap"),
  color: z.string().max(20).default("#F59E0B"),
  defaultNote: z.string().max(255).optional().nullable(),
  isPinned: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const useTemplateSchema = z.object({
  // cho phep override 1 vai field khi tao tu mau
  amount: z.coerce.number().positive().optional(),
  walletId: z.coerce.number().int().positive().optional(),
  description: z.string().max(255).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ===== Report query =====
export const reportQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  walletId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
});
