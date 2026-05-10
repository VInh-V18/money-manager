import { Notification } from "../models/index.js";

/**
 * Tao notification - dung khap noi (cron, controller, ...)
 */
export const createNotification = async (
  userId,
  { type, title, message, severity = "info", relatedEntity = null },
  dbTx = null
) => {
  return Notification.create(
    { userId, type, title, message, severity, relatedEntity },
    { transaction: dbTx }
  );
};
