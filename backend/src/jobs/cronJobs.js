import cron from "node-cron";
import { Op } from "sequelize";
import { generateDueFixedExpenses } from "../services/fixedExpenseService.js";
import { calculateBudgetsSummary, performBudgetRollover } from "../services/budgetService.js";
import { createNotification } from "../services/notificationService.js";
import {
  AiChatSession, Budget, Debt, FinancialGoal,
  NotificationPreference, Otp, RefreshToken, Transaction, User,
} from "../models/index.js";
import { formatDate, today } from "../utils/date.js";
import { logger } from "../utils/logger.js";

const TZ = "Asia/Ho_Chi_Minh";

/**
 * Job 1: Quét chi cố định đến hạn — 00:05 mỗi ngày
 */
const fixedExpenseJob = async () => {
  logger.info("[CRON] Bắt đầu: chi cố định đến hạn");
  try {
    const result = await generateDueFixedExpenses();
    logger.info(
      `[CRON] Xong: ${result.generated} giao dịch tạo mới, ${result.warned} cảnh báo, ${result.scanned} tổng quét`
    );
  } catch (err) {
    logger.error("[CRON] Lỗi job chi cố định:", err);
  }
};

/**
 * Job 2: Cảnh báo ngân sách — 09:00 mỗi ngày
 * Tối ưu: lấy tất cả budget active, gom theo userId, batch notify
 */
const budgetWarningJob = async () => {
  logger.info("[CRON] Bắt đầu: cảnh báo ngân sách");
  try {
    // Lấy danh sách userId có budget active — 1 query
    const userIds = await Budget.findAll({
      where: { isActive: true },
      attributes: ["userId"],
      group: ["userId"],
      raw: true,
    }).then((rows) => rows.map((r) => r.userId));

    let total = 0;
    // Xử lý song song theo user
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const items = await calculateBudgetsSummary(uid);
          await Promise.all(
            items.map(async (b) => {
              if (b.isExceeded) {
                await createNotification(uid, {
                  type: "budget_exceeded",
                  severity: "danger",
                  title: "Vượt ngân sách!",
                  message: `Ngân sách "${b.name}" đã chi ${Math.round(b.usedPercent)}% (vượt ${Math.round(b.spent - b.limit).toLocaleString("vi-VN")}đ)`,
                  relatedEntity: { entityType: "budget", entityId: b.id },
                });
                total++;
              } else if (b.isWarning) {
                await createNotification(uid, {
                  type: "budget_warning",
                  severity: "warning",
                  title: "Sắp hết ngân sách",
                  message: `Ngân sách "${b.name}" đã dùng ${Math.round(b.usedPercent)}%`,
                  relatedEntity: { entityType: "budget", entityId: b.id },
                });
                total++;
              }
            })
          );
        } catch (err) {
          logger.error(`[CRON] Lỗi cảnh báo ngân sách userId=${uid}:`, err);
        }
      })
    );
    logger.info(`[CRON] Xong: tạo ${total} thông báo ngân sách`);
  } catch (err) {
    logger.error("[CRON] Lỗi job ngân sách:", err);
  }
};

/**
 * Job 3: Cập nhật trạng thái nợ quá hạn — 01:00 mỗi ngày
 */
const debtOverdueJob = async () => {
  logger.info("[CRON] Bắt đầu: cập nhật nợ quá hạn");
  try {
    const todayStr = formatDate(today());

    const notifyDebt = async (d, { overdue = false } = {}) => {
      if (d.lastDueNotifiedDate === todayStr) return false;
      await createNotification(d.userId, {
        type: "debt_due",
        severity: overdue ? "danger" : "warning",
        title: overdue ? "Khoản nợ quá hạn" : "Khoản nợ đến hạn",
        message:
          d.type === "owed_by_me"
            ? `Bạn cần trả ${d.personName} ${Number(d.amount).toLocaleString("vi-VN")}đ`
            : `${d.personName} cần trả bạn ${Number(d.amount).toLocaleString("vi-VN")}đ`,
        relatedEntity: { entityType: "debt", entityId: d.id },
      });
      await d.update({ lastDueNotifiedDate: todayStr });
      return true;
    };

    const [dueToday, overdueDebts, [updatedCount]] = await Promise.all([
      Debt.findAll({
        where: {
          status: "active",
          dueDate: todayStr,
          [Op.or]: [
            { lastDueNotifiedDate: { [Op.ne]: todayStr } },
            { lastDueNotifiedDate: { [Op.is]: null } },
          ],
        },
      }),
      Debt.findAll({
        where: {
          status: "overdue",
          dueDate: { [Op.lt]: todayStr, [Op.ne]: null },
          [Op.or]: [
            { lastDueNotifiedDate: { [Op.ne]: todayStr } },
            { lastDueNotifiedDate: { [Op.is]: null } },
          ],
        },
      }),
      Debt.update(
        { status: "overdue" },
        { where: { status: "active", dueDate: { [Op.lt]: todayStr, [Op.ne]: null } } }
      ),
    ]);

    const notifications = await Promise.all([
      ...dueToday.map((d) => notifyDebt(d)),
      ...overdueDebts.map((d) => notifyDebt(d, { overdue: true })),
    ]);
    const notified = notifications.filter(Boolean).length;

    logger.info(`[CRON] Xong: ${updatedCount} nợ → quá hạn, ${notified} thông báo nợ`);
  } catch (err) {
    logger.error("[CRON] Lỗi job nợ:", err);
  }
};

/**
 * Job 4: Dọn dẹp OTP / session hết hạn — 02:00 mỗi ngày
 */
const securityCleanupJob = async () => {
  logger.info("[CRON] Bắt đầu: dọn dẹp bảo mật");
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [deletedOtp, [revokedSessions]] = await Promise.all([
      Otp.destroy({
        where: {
          [Op.or]: [
            { expiresAt: { [Op.lt]: now } },
            { used: true, createdAt: { [Op.lt]: oneDayAgo } },
          ],
        },
      }),
      RefreshToken.update(
        { revoked: true, revokedAt: now },
        { where: { revoked: false, expiresAt: { [Op.lt]: now } } }
      ),
    ]);

    logger.info(`[CRON] Xong: xóa ${deletedOtp} OTP, thu hồi ${revokedSessions} session hết hạn`);
  } catch (err) {
    logger.error("[CRON] Lỗi job dọn dẹp bảo mật:", err);
  }
};

/**
 * Job 5: Nhắc nhập giao dịch — mỗi giờ
 */
const currentVietnamTime = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:00` };
};

const remindLogJob = async () => {
  logger.info("[CRON] Bắt đầu: nhắc nhập giao dịch");
  try {
    const now = currentVietnamTime();
    const prefs = await NotificationPreference.findAll({
      where: {
        remindLogEnabled: true,
        remindLogTime: now.time,
        [Op.or]: [
          { lastRemindLogDate: { [Op.ne]: now.date } },
          { lastRemindLogDate: { [Op.is]: null } },
        ],
      },
      attributes: ["id", "userId", "lastRemindLogDate"],
    });

    // Đếm giao dịch hôm nay theo từng userId — 1 query group by
    const userIds = prefs.map((p) => p.userId);
    const txCounts = userIds.length
      ? await Transaction.findAll({
          where: { userId: { [Op.in]: userIds }, transactionDate: now.date },
          attributes: ["userId", [Transaction.sequelize.fn("COUNT", Transaction.sequelize.col("id")), "cnt"]],
          group: ["userId"],
          raw: true,
        })
      : [];
    const countMap = Object.fromEntries(txCounts.map((r) => [r.userId, Number(r.cnt)]));

    let total = 0;
    await Promise.all(
      prefs.map(async (pref) => {
        if ((countMap[pref.userId] ?? 0) === 0) {
          await createNotification(pref.userId, {
            type: "remind_log",
            severity: "info",
            title: "Nhắc nhập giao dịch",
            message: "Hôm nay bạn chưa nhập giao dịch nào. Hãy cập nhật để báo cáo chính xác hơn.",
          });
          total++;
        }
        await pref.update({ lastRemindLogDate: now.date });
      })
    );
    logger.info(`[CRON] Xong: tạo ${total} nhắc nhập giao dịch`);
  } catch (err) {
    logger.error("[CRON] Lỗi job nhắc nhập giao dịch:", err);
  }
};

/**
 * Job 6: Cập nhật goal OVERDUE + thông báo sắp đạt — 00:30 mỗi ngày
 */
const goalStatusJob = async () => {
  logger.info("[CRON] Bắt đầu: cập nhật trạng thái mục tiêu");
  try {
    const todayStr = formatDate(today());

    const [[overdueCount], nearGoals] = await Promise.all([
      FinancialGoal.update(
        { status: "overdue" },
        {
          where: {
            status: "active",
            targetDate: { [Op.lt]: todayStr, [Op.ne]: null },
          },
        }
      ),
      FinancialGoal.findAll({
        where: { status: "active", targetDate: { [Op.ne]: null } },
        attributes: ["id", "userId", "name", "targetAmount", "currentAmount"],
      }),
    ]);

    let notified = 0;
    await Promise.all(
      nearGoals.map(async (g) => {
        const pct =
          Number(g.targetAmount) > 0
            ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
            : 0;
        if (pct >= 90 && pct < 100) {
          await createNotification(g.userId, {
            type: "goal_progress",
            severity: "success",
            title: "Mục tiêu sắp đạt!",
            message: `"${g.name}" đã đạt ${Math.round(pct)}% — sắp hoàn thành!`,
            relatedEntity: { entityType: "goal", entityId: g.id },
          });
          notified++;
        }
      })
    );

    logger.info(`[CRON] Xong: ${overdueCount} mục tiêu → quá hạn, ${notified} thông báo gần đạt`);
  } catch (err) {
    logger.error("[CRON] Lỗi job mục tiêu:", err);
  }
};

/**
 * Job 7: Budget rollover — 00:01 ngày 1 mỗi tháng
 */
const budgetRolloverJob = async () => {
  logger.info("[CRON] Bắt đầu: ngân sách rollover");
  try {
    const result = await performBudgetRollover();
    logger.info(`[CRON] Xong: rollover ${result.processedCount} ngân sách`);
  } catch (err) {
    logger.error("[CRON] Lỗi job budget rollover:", err);
  }
};

/**
 * Job 8: Dọn dẹp phiên chat AI cũ (> 90 ngày) — 03:00 ngày 1 mỗi tháng
 */
const aiSessionCleanupJob = async () => {
  logger.info("[CRON] Bắt đầu: dọn dẹp phiên chat AI cũ");
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const deleted = await AiChatSession.destroy({
      where: { updatedAt: { [Op.lt]: cutoff } },
    });
    logger.info(`[CRON] Xong: xóa ${deleted} phiên chat AI cũ hơn 90 ngày`);
  } catch (err) {
    logger.error("[CRON] Lỗi job dọn dẹp AI session:", err);
  }
};

/**
 * Khởi tạo tất cả cron job
 */
export const initCronJobs = () => {
  cron.schedule("5 0 * * *",    fixedExpenseJob,    { timezone: TZ });
  cron.schedule("0 9 * * *",    budgetWarningJob,   { timezone: TZ });
  cron.schedule("0 1 * * *",    debtOverdueJob,     { timezone: TZ });
  cron.schedule("0 2 * * *",    securityCleanupJob, { timezone: TZ });
  cron.schedule("0 * * * *",    remindLogJob,       { timezone: TZ });
  cron.schedule("30 0 * * *",   goalStatusJob,      { timezone: TZ });
  cron.schedule("1 0 1 * *",    budgetRolloverJob,  { timezone: TZ });
  cron.schedule("0 3 1 * *",    aiSessionCleanupJob,{ timezone: TZ });

  logger.info("✓ Cron jobs đã khởi tạo (8 jobs)");
};

export {
  fixedExpenseJob, budgetWarningJob, debtOverdueJob, securityCleanupJob,
  remindLogJob, goalStatusJob, budgetRolloverJob, aiSessionCleanupJob,
};
