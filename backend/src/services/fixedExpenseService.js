import { Op } from "sequelize";
import {
  FixedExpense,
  Wallet,
  sequelize,
} from "../models/index.js";
import {
  formatDate,
  today,
  computeNextDueDate,
  addDays,
} from "../utils/date.js";
import { createTransactionWithBalance } from "./transactionService.js";
import { createNotification } from "./notificationService.js";

/**
 * Quet tat ca chi co dinh den han -> tao giao dich tuong ung.
 *
 * Logic:
 *   - Lay tat ca FE active co nextDueDate <= hom nay
 *   - Voi moi FE:
 *       + Neu autoDeduct = true: tao GD expense, tru vi
 *           - Neu vi khong du tien: KHONG tao GD, tao notif canh bao
 *       + Neu autoDeduct = false: chi tao notification "den han"
 *       + Cap nhat nextDueDate cho lan sau
 *   - Quet luon FE co nextDueDate trong vong remindDaysBefore -> nhac truoc
 *
 * Han la chuoi YYYY-MM-DD (DATEONLY) -> so sanh chuoi an toan
 */
export const generateDueFixedExpenses = async (userId = null) => {
  const todayStr = formatDate(today());
  const where = {
    isActive: true,
    nextDueDate: { [Op.lte]: todayStr },
  };
  if (userId) where.userId = userId;

  const items = await FixedExpense.findAll({ where });
  let generated = 0;
  let warned = 0;

  for (const fe of items) {
    try {
      // neu da qua endDate -> deactivate
      if (fe.endDate && fe.endDate < todayStr) {
        await fe.update({ isActive: false });
        continue;
      }

      if (fe.autoDeduct) {
        // check so du
        const wallet = await Wallet.findByPk(fe.walletId);
        if (!wallet || Number(wallet.balance) < Number(fe.amount)) {
          await createNotification(fe.userId, {
            type: "low_balance",
            severity: "danger",
            title: "Vi khong du tien cho khoan chi co dinh",
            message: `Khoan "${fe.name}" (${fe.amount}) den han nhung vi "${
              wallet?.name || "?"
            }" khong du tien`,
            relatedEntity: { entityType: "fixed_expense", entityId: fe.id },
          });
          warned++;
          // van day nextDueDate de tranh lap canh bao moi ngay
          const next = computeNextDueDate(
            fe.nextDueDate,
            fe.frequency,
            fe.customIntervalDays
          );
          await fe.update({ nextDueDate: formatDate(next) });
          continue;
        }

        // tao GD trong DB transaction
        await sequelize.transaction(async (dbTx) => {
          await createTransactionWithBalance(
            fe.userId,
            {
              walletId: fe.walletId,
              categoryId: fe.categoryId,
              type: "expense",
              subType: "fixed",
              amount: fe.amount,
              description: fe.name,
              note: `Tu khoan chi co dinh #${fe.id}`,
              transactionDate: fe.nextDueDate,
              fixedExpenseId: fe.id,
            },
            dbTx
          );

          // cap nhat nextDueDate
          const next = computeNextDueDate(
            fe.nextDueDate,
            fe.frequency,
            fe.customIntervalDays
          );
          await fe.update(
            {
              lastGeneratedDate: fe.nextDueDate,
              nextDueDate: formatDate(next),
            },
            { transaction: dbTx }
          );

          await createNotification(
            fe.userId,
            {
              type: "fixed_expense_generated",
              severity: "info",
              title: "Da tao giao dich tu chi co dinh",
              message: `"${fe.name}" da tu dong tru ${fe.amount} tu vi`,
              relatedEntity: { entityType: "fixed_expense", entityId: fe.id },
            },
            dbTx
          );
        });
        generated++;
      } else {
        // chi nhac, khong tu tao
        await createNotification(fe.userId, {
          type: "fixed_expense_due",
          severity: "warning",
          title: "Khoan chi co dinh den han",
          message: `"${fe.name}" (${fe.amount}) cho ban xac nhan`,
          relatedEntity: { entityType: "fixed_expense", entityId: fe.id },
        });
        warned++;
      }
    } catch (err) {
      console.error(`[FixedExpense ${fe.id}] generate fail:`, err.message);
    }
  }

  // === Quet item sap den han trong remindDaysBefore -> tao reminder
  // (chi cho nhung cai chua duoc reminder gan day)
  const remindCutoff = formatDate(addDays(today(), 7));
  const upcoming = await FixedExpense.findAll({
    where: {
      isActive: true,
      nextDueDate: { [Op.between]: [todayStr, remindCutoff] },
      ...(userId ? { userId } : {}),
    },
  });

  for (const fe of upcoming) {
    const daysUntil = Math.floor(
      (new Date(fe.nextDueDate) - today()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil > 0 && daysUntil <= fe.remindDaysBefore) {
      await createNotification(fe.userId, {
        type: "fixed_expense_due",
        severity: "info",
        title: "Sap den han khoan chi co dinh",
        message: `"${fe.name}" (${fe.amount}) se den han trong ${daysUntil} ngay`,
        relatedEntity: { entityType: "fixed_expense", entityId: fe.id },
      });
    }
  }

  return { generated, warned, scanned: items.length };
};
