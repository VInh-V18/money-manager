import { z } from "zod";

export const createFeedbackSchema = z.object({
  type: z.enum(["feedback", "bug", "feature_request"]).default("feedback"),
  title: z.string().min(3, "Tieu de toi thieu 3 ky tu").max(150),
  message: z.string().min(10, "Noi dung toi thieu 10 ky tu").max(5000),
});

export const listFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["open", "reviewing", "resolved", "closed"]).optional(),
  type: z.enum(["feedback", "bug", "feature_request"]).optional(),
});
