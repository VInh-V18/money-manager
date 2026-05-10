import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Vui long nhap ten danh muc").max(100),
  type: z.enum(["income", "expense"]),
  icon: z.string().max(50).default("folder"),
  color: z.string().max(20).default("#6B7280"),
  parentId: z.coerce.number().int().positive().optional().nullable(),
  monthlyBudget: z.coerce.number().min(0).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // khong cho doi type vi se gay loan giao dich da co
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  parentId: z.coerce.number().int().positive().optional().nullable(),
  monthlyBudget: z.coerce.number().min(0).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
});
