import { z } from "zod";

const walletTypeEnum = z.enum([
  "cash",
  "bank",
  "ewallet",
  "saving",
  "investment",
  "other",
]);

export const createWalletSchema = z.object({
  name: z.string().min(1, "Vui long nhap ten vi").max(100),
  type: walletTypeEnum.default("cash"),
  initialBalance: z.coerce.number().min(0, "So du khong duoc am").default(0),
  currency: z.string().max(10).default("VND"),
  color: z.string().max(20).default("#3B82F6"),
  icon: z.string().max(50).default("wallet"),
  note: z.string().max(500).optional().nullable(),
  lowBalanceThreshold: z.coerce.number().min(0).optional().nullable(),
  excludeFromTotal: z.coerce.boolean().default(false),
});

export const updateWalletSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: walletTypeEnum.optional(),
  currency: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
  note: z.string().max(500).optional().nullable(),
  lowBalanceThreshold: z.coerce.number().min(0).optional().nullable(),
  isActive: z.coerce.boolean().optional(),
  excludeFromTotal: z.coerce.boolean().optional(),
});

export const transferWalletSchema = z
  .object({
    fromWalletId: z.coerce.number().int().positive(),
    toWalletId: z.coerce.number().int().positive(),
    amount: z.coerce.number().positive("So tien phai > 0"),
    fee: z.coerce.number().min(0).default(0),
    transferDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay phai dang YYYY-MM-DD"),
    note: z.string().max(500).optional().nullable(),
  })
  .refine((d) => d.fromWalletId !== d.toWalletId, {
    message: "Vi nguon va vi dich phai khac nhau",
    path: ["toWalletId"],
  });
