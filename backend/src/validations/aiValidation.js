import { z } from "zod";

export const aiChatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  mode: z
    .enum(["advisor", "forecast", "risk", "budget", "transaction_parser"])
    .default("advisor"),
  sessionId: z.number().int().positive().optional().nullable(),
});

export const aiTextSchema = z.object({
  text: z.string().trim().min(2).max(500),
  type: z.enum(["income", "expense"]).optional(),
});
