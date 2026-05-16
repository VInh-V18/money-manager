import { Op } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { notFoundError, forbiddenError } from "../utils/errors.js";
import { Notification } from "../models/index.js";
import {
  getOrCreateNotificationPreference,
  updateNotificationPreference,
} from "../services/notificationService.js";

export const getPreferences = asyncHandler(async (req, res) => {
  const preference = await getOrCreateNotificationPreference(req.user.id);
  return ok(res, { preferences: preference });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const preference = await updateNotificationPreference(req.user.id, req.body);
  return ok(res, { preferences: preference }, "Da cap nhat cai dat thong bao");
});

export const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const onlyUnread = req.query.unread === "true";

  const where = { userId: req.user.id };
  if (onlyUnread) where.isRead = false;

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  const unreadCount = await Notification.count({
    where: { userId: req.user.id, isRead: false },
  });

  return ok(res, {
    items: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    unreadCount,
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.count({
    where: { userId: req.user.id, isRead: false },
  });
  return ok(res, { unreadCount: count });
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findByPk(req.params.id);
  if (!n) throw notFoundError();
  if (n.userId !== req.user.id) throw forbiddenError();
  await n.update({ isRead: true, readAt: new Date() });
  return ok(res, { notification: n });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { userId: req.user.id, isRead: false } }
  );
  return ok(res, null, "Da danh dau tat ca da doc");
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findByPk(req.params.id);
  if (!n) throw notFoundError();
  if (n.userId !== req.user.id) throw forbiddenError();
  await n.destroy();
  return ok(res, null, "Da xoa thong bao");
});

export const deleteAllRead = asyncHandler(async (req, res) => {
  const cnt = await Notification.destroy({
    where: { userId: req.user.id, isRead: true },
  });
  return ok(res, { deleted: cnt }, `Da xoa ${cnt} thong bao da doc`);
});
