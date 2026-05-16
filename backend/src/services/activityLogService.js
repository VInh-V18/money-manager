import { ActivityLog } from "../models/index.js";

export const writeActivityLog = async ({
  userId,
  action,
  entityType,
  entityId,
  payload,
  ipAddress,
  transaction,
}) => {
  if (!userId || !action || !entityType) return;
  await ActivityLog.create(
    {
      userId,
      action,
      entityType,
      entityId,
      payload,
      ipAddress,
    },
    transaction ? { transaction } : undefined
  ).catch(() => {});
};
