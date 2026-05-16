import { z } from "zod";
import { NOTIFICATION_TYPES } from "../models/NotificationPreference.js";

const notificationTypePreferenceSchema = z
  .object(
    NOTIFICATION_TYPES.reduce((shape, type) => {
      shape[type] = z.coerce.boolean().optional();
      return shape;
    }, {})
  )
  .partial();

export const updateNotificationPreferenceSchema = z.object({
  inAppEnabled: z.coerce.boolean().optional(),
  emailEnabled: z.coerce.boolean().optional(),
  remindLogEnabled: z.coerce.boolean().optional(),
  remindLogTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Gio nhac phai dang HH:MM")
    .optional(),
  typePreferences: notificationTypePreferenceSchema.optional(),
});
