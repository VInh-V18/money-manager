import { z } from "zod";

const subTypeEnum = z.enum([
  "regular",
  "daily_wage",
  "hourly_wage",
  "bonus",
  "freelance",
  "salary",
  "gift",
  "refund",
  "fixed",
  "transfer_fee",
  "other",
]);

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, "Idempotency key qua ngan")
  .max(100, "Idempotency key qua dai")
  .regex(/^[a-zA-Z0-9:_-]+$/, "Idempotency key khong hop le");

export const createTransactionSchema = z.object({
  walletId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  type: z.enum(["income", "expense"]),
  subType: subTypeEnum.default("regular"),
  amount: z.coerce.number().positive("So tien phai > 0"),
  description: z.string().max(255).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay phai dang YYYY-MM-DD"),
  transactionTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Gio phai dang HH:MM hoac HH:MM:SS")
    .optional()
    .nullable(),
  receiptUrl: z.string().max(1000).optional().nullable(),
  idempotencyKey: idempotencyKeySchema.optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
  // chi tieu hot tuc thoi co the bo qua canh bao am tien
  allowNegative: z.coerce.boolean().default(false),
});

export const updateTransactionSchema = z.object({
  walletId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  type: z.enum(["income", "expense"]).optional(),
  subType: subTypeEnum.optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().max(255).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  transactionTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  receiptUrl: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
  allowNegative: z.coerce.boolean().default(false),
});

export const deleteTransactionsBulkSchema = z.object({
  ids: z
    .array(z.coerce.number().int().positive())
    .min(1, "Chon it nhat 1 giao dich")
    .max(100, "Chi duoc xoa toi da 100 giao dich moi lan"),
});

export const listTransactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["income", "expense"]).optional(),
  walletId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  // YYYY-MM-DD
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  search: z.string().max(255).optional(),
  tag: z.string().trim().max(80).optional(),
  hasReceipt: z.coerce.boolean().optional(),
  // dat hang: createdAt | transactionDate | amount
  sortBy: z.enum(["transactionDate", "createdAt", "amount"]).default("transactionDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

// helper rieng cho thu nhap theo ngay/gio
export const createDailyWageSchema = z.object({
  walletId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  dailyRate: z.coerce.number().positive(),
  numberOfDays: z.coerce.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(255).optional().nullable(),
});

export const createHourlyWageSchema = z.object({
  walletId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  hourlyRate: z.coerce.number().positive(),
  numberOfHours: z.coerce.number().positive(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.string().max(50).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
});
