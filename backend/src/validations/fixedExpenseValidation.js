import { z } from "zod";

const freqEnum = z.enum(["daily", "weekly", "monthly", "yearly", "custom"]);

export const createFixedExpenseSchema = z.object({
  walletId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(150),
  amount: z.coerce.number().positive(),
  frequency: freqEnum.default("monthly"),
  customIntervalDays: z.coerce.number().int().positive().optional().nullable(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  autoDeduct: z.coerce.boolean().default(true),
  remindDaysBefore: z.coerce.number().int().min(0).max(30).default(1),
  note: z.string().max(500).optional().nullable(),
});

export const updateFixedExpenseSchema = createFixedExpenseSchema
  .partial()
  .extend({
    isActive: z.coerce.boolean().optional(),
  });
