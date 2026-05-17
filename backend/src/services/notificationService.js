import {
  Notification,
  NotificationPreference,
  User,
} from "../models/index.js";
import {
  NOTIFICATION_TYPES,
  defaultTypePreferences,
} from "../models/NotificationPreference.js";
import { sendNotificationEmail } from "./mailService.js";

export const normalizeNotificationPreferences = (value = {}) => {
  const defaults = defaultTypePreferences();
  const incomingTypes = value.typePreferences || {};
  const typePreferences = NOTIFICATION_TYPES.reduce((acc, type) => {
    acc[type] =
      typeof incomingTypes[type] === "boolean" ? incomingTypes[type] : defaults[type];
    return acc;
  }, {});

  return {
    inAppEnabled:
      typeof value.inAppEnabled === "boolean" ? value.inAppEnabled : true,
    emailEnabled:
      typeof value.emailEnabled === "boolean" ? value.emailEnabled : false,
    remindLogEnabled:
      typeof value.remindLogEnabled === "boolean" ? value.remindLogEnabled : true,
    remindLogTime:
      typeof value.remindLogTime === "string" && /^\d{2}:\d{2}$/.test(value.remindLogTime)
        ? value.remindLogTime
        : "20:00",
    lastRemindLogDate: value.lastRemindLogDate || null,
    typePreferences,
  };
};

export const getOrCreateNotificationPreference = async (userId) => {
  const [preference] = await NotificationPreference.findOrCreate({
    where: { userId },
    defaults: normalizeNotificationPreferences(),
  });
  const normalized = normalizeNotificationPreferences(preference.toJSON());
  const storedTypes = preference.typePreferences || {};
  const needsUpdate =
    preference.inAppEnabled !== normalized.inAppEnabled ||
    preference.emailEnabled !== normalized.emailEnabled ||
    preference.remindLogEnabled !== normalized.remindLogEnabled ||
    preference.remindLogTime !== normalized.remindLogTime ||
    NOTIFICATION_TYPES.some((type) => storedTypes[type] !== normalized.typePreferences[type]);

  if (needsUpdate) {
    await preference.update(normalized);
  }

  return preference;
};

export const updateNotificationPreference = async (userId, data) => {
  const preference = await getOrCreateNotificationPreference(userId);
  const normalized = normalizeNotificationPreferences({
    ...preference.toJSON(),
    ...data,
    typePreferences: {
      ...(preference.typePreferences || {}),
      ...(data.typePreferences || {}),
    },
  });
  await preference.update(normalized);
  return preference;
};

/**
 * Tao notification - dung khap noi (cron, controller, ...)
 */
export const createNotification = async (
  userId,
  { type, title, message, severity = "info", relatedEntity = null },
  dbTx = null
) => {
  const preference = await getOrCreateNotificationPreference(userId);
  const typePreferences = preference.typePreferences || defaultTypePreferences();
  if (typePreferences[type] === false) return null;

  const shouldCreateInApp = preference.inAppEnabled !== false;
  const shouldSendEmail = preference.emailEnabled === true;
  let notification = null;

  if (shouldCreateInApp) {
    notification = await Notification.create(
      { userId, type, title, message, severity, relatedEntity },
      { transaction: dbTx }
    );
  }

  if (shouldSendEmail) {
    const user = await User.findByPk(userId, {
      attributes: ["email"],
      transaction: dbTx,
    });
    if (user?.email) {
      try {
        await sendNotificationEmail({
          to: user.email,
          title,
          message,
          severity,
        });
      } catch (err) {
        console.warn("Không gửi được email thông báo:", err.message);
      }
    }
  }

  return notification;
};
