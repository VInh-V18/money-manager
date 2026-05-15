import cron from "node-cron";
import { Op } from "sequelize";
import { generateDueFixedExpenses } from "../services/fixedExpenseService.js";
import { calculateBudgetsSummary } from "../services/budgetService.js";
import { createNotification } from "../services/notificationService.js";
import { Budget, Debt, Otp, RefreshToken, User } from "../models/index.js";
import { formatDate, today } from "../utils/date.js";

/**
 * Job 1: Quet chi co dinh den han - chay 0h05 moi ngay
 */
const fixedExpenseJob = async () => {
  console.log("[CRON] Chay job: chi co dinh den han...");
  try {
    const result = await generateDueFixedExpenses();
    console.log(
      `[CRON] Done: ${result.generated} GD tao moi, ${result.warned} canh bao, ${result.scanned} tong quet`
    );
  } catch (err) {
    console.error("[CRON] Loi job chi co dinh:", err.message);
  }
};

/**
 * Job 2: Quet ngan sach - chay 9h moi ngay
 *   - Voi moi user co budget active, tinh % da dung
 *   - Neu vuot warnThreshold lan dau hom nay -> tao notif
 */
const budgetWarningJob = async () => {
  console.log("[CRON] Chay job: canh bao ngan sach...");
  try {
    const users = await User.findAll({
      attributes: ["id"],
      include: [
        {
          model: Budget,
          where: { isActive: true },
          required: true,
        },
      ],
    });

    let total = 0;
    for (const u of users) {
      const items = await calculateBudgetsSummary(u.id);
      for (const b of items) {
        if (b.isExceeded) {
          await createNotification(u.id, {
            type: "budget_exceeded",
            severity: "danger",
            title: "Vuot ngan sach!",
            message: `Ngan sach "${b.name}" da chi ${Math.round(b.usedPercent)}% (vuot ${Math.round(b.spent - b.limit)})`,
            relatedEntity: { entityType: "budget", entityId: b.id },
          });
          total++;
        } else if (b.isWarning) {
          await createNotification(u.id, {
            type: "budget_warning",
            severity: "warning",
            title: "Sap het ngan sach",
            message: `Ngan sach "${b.name}" da dung ${Math.round(b.usedPercent)}%`,
            relatedEntity: { entityType: "budget", entityId: b.id },
          });
          total++;
        }
      }
    }
    console.log(`[CRON] Done: tao ${total} notif ngan sach`);
  } catch (err) {
    console.error("[CRON] Loi job ngan sach:", err.message);
  }
};

/**
 * Job 3: Cap nhat trang thai overdue cua no - chay 1h moi ngay
 */
const debtOverdueJob = async () => {
  console.log("[CRON] Chay job: cap nhat no qua han...");
  try {
    const todayStr = formatDate(today());
    // chuyen status sang overdue
    const [updated] = await Debt.update(
      { status: "overdue" },
      {
        where: {
          status: "active",
          dueDate: { [Op.lt]: todayStr, [Op.ne]: null },
        },
      }
    );

    // tao notif cho cac khoan vua qua han hom nay
    const newlyOverdue = await Debt.findAll({
      where: { status: "overdue", dueDate: todayStr },
    });
    for (const d of newlyOverdue) {
      await createNotification(d.userId, {
        type: "debt_due",
        severity: "warning",
        title: "Khoan no qua han",
        message:
          d.type === "owed_by_me"
            ? `Ban can tra ${d.personName} ${d.amount}`
            : `${d.personName} can tra ban ${d.amount}`,
        relatedEntity: { entityType: "debt", entityId: d.id },
      });
    }
    console.log(`[CRON] Done: ${updated} no chuyen overdue`);
  } catch (err) {
    console.error("[CRON] Loi job no:", err.message);
  }
};

/**
 * Job 4: Don dep du lieu bao mat het han - chay 2h moi ngay
 */
const securityCleanupJob = async () => {
  console.log("[CRON] Chay job: don dep OTP/session het han...");
  try {
    const now = new Date();
    const deletedOtp = await Otp.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: now } },
          { used: true, createdAt: { [Op.lt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    const [revokedSessions] = await RefreshToken.update(
      { revoked: true, revokedAt: now },
      {
        where: {
          revoked: false,
          expiresAt: { [Op.lt]: now },
        },
      }
    );
    console.log(`[CRON] Done: xoa ${deletedOtp} OTP, revoke ${revokedSessions} session het han`);
  } catch (err) {
    console.error("[CRON] Loi job don dep bao mat:", err.message);
  }
};

/**
 * Khoi tao tat ca cron job
 */
export const initCronJobs = () => {
  // 0h05: chi co dinh
  cron.schedule(
    "5 0 * * *",
    fixedExpenseJob,
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  // 9h00: canh bao ngan sach
  cron.schedule(
    "0 9 * * *",
    budgetWarningJob,
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  // 1h00: no qua han
  cron.schedule(
    "0 1 * * *",
    debtOverdueJob,
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  // 2h00: don dep OTP/session het han
  cron.schedule(
    "0 2 * * *",
    securityCleanupJob,
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  console.log("✓ Cron jobs da khoi tao (4 jobs)");
};

// Export tung job rieng de co the chay tay khi can
export { fixedExpenseJob, budgetWarningJob, debtOverdueJob, securityCleanupJob };
