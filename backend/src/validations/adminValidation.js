import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN", "PREMIUM_USER", "SUPPORT", "AUDITOR"]),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(["open", "reviewing", "resolved", "closed"]),
});
