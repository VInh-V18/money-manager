import { z } from "zod";

const periodEnum = z.enum(["daily", "weekly", "monthly", "yearly", "custom"]);

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(150),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  amount: z.coerce.number().positive(),
  period: periodEnum.default("monthly"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  warnThreshold: z.coerce.number().int().min(1).max(100).default(80),
  strictMode: z.coerce.boolean().default(false),
  note: z.string().max(500).optional().nullable(),
});

export const updateBudgetSchema = createBudgetSchema.partial();
