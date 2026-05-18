import { Op, fn, col } from "sequelize";
import { Budget, Transaction, Category } from "../models/index.js";
import { logger } from "../utils/logger.js";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  startOfYear,
  formatDate,
  addDays,
} from "../utils/date.js";

/**
 * Tinh khoang thoi gian cua budget dua tren period + startDate
 */
export const getBudgetPeriodRange = (budget, refDate = new Date()) => {
  const period = budget.period;
  const ref = new Date(refDate);

  switch (period) {
    case "daily": {
      const d = formatDate(ref);
      return { from: d, to: d };
    }
    case "weekly": {
      const start = startOfWeek(ref);
      return { from: formatDate(start), to: formatDate(addDays(start, 6)) };
    }
    case "monthly": {
      return {
        from: formatDate(startOfMonth(ref)),
        to: formatDate(endOfMonth(ref)),
      };
    }
    case "yearly": {
      const y = ref.getFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    case "custom": {
      return {
        from: budget.startDate,
        to: budget.endDate || formatDate(ref),
      };
    }
    default:
      return {
        from: formatDate(startOfMonth(ref)),
        to: formatDate(endOfMonth(ref)),
      };
  }
};

/**
 * Tinh tong da chi cho 1 budget trong khoang period hien tai
 * Neu rolloverEnabled = true, effective limit = amount + rolloverAmount (khoan du tu ky truoc)
 */
export const calculateBudgetSpent = async (budget) => {
  const { from, to } = getBudgetPeriodRange(budget);

  const where = {
    userId: budget.userId,
    type: "expense",
    transactionDate: { [Op.between]: [from, to] },
  };
  if (budget.categoryId) where.categoryId = budget.categoryId;

  const result = await Transaction.findOne({
    where,
    attributes: [[fn("SUM", col("amount")), "totalSpent"]],
    raw: true,
  });
  const spent = Number(result?.totalSpent || 0);
  const baseLimit = Number(budget.amount);
  const rollover = budget.rolloverEnabled ? Math.max(0, Number(budget.rolloverAmount || 0)) : 0;
  const limit = baseLimit + rollover;
  const remaining = limit - spent;
  const usedPercent = limit > 0 ? (spent / limit) * 100 : 0;

  return {
    spent,
    limit,
    baseLimit,
    rolloverAmount: rollover,
    remaining,
    usedPercent: Math.round(usedPercent * 100) / 100,
    isExceeded: spent > limit,
    isWarning: usedPercent >= budget.warnThreshold,
    periodFrom: from,
    periodTo: to,
  };
};

/**
 * Chay cuoi ky (cuoi thang/tuan/nam) de tinh phan du va luu vao rolloverAmount cho ky moi.
 * Goi tu cron job.
 */
export const performBudgetRollover = async (userId = null) => {
  const where = { isActive: true, rolloverEnabled: true };
  if (userId) where.userId = userId;

  const budgets = await Budget.findAll({ where });
  let processedCount = 0;

  for (const budget of budgets) {
    try {
      const period = budget.period;
      if (!["monthly", "weekly", "yearly"].includes(period)) continue;

      const ref = new Date();
      let prevRef;
      if (period === "monthly") {
        prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 15);
      } else if (period === "weekly") {
        prevRef = addDays(ref, -7);
      } else {
        prevRef = new Date(ref.getFullYear() - 1, 6, 1);
      }

      const { from: prevFrom, to: prevTo } = getBudgetPeriodRange(budget, prevRef);
      const { from: curFrom } = getBudgetPeriodRange(budget, ref);

      if (curFrom !== formatDate(ref)) continue;

      const spentWhere = {
        userId: budget.userId,
        type: "expense",
        transactionDate: { [Op.between]: [prevFrom, prevTo] },
      };
      if (budget.categoryId) spentWhere.categoryId = budget.categoryId;

      const spentResult = await Transaction.findOne({
        where: spentWhere,
        attributes: [[fn("SUM", col("amount")), "total"]],
        raw: true,
      });
      const prevSpent = Number(spentResult?.total || 0);
      const prevEffectiveLimit = Number(budget.amount) + Math.max(0, Number(budget.rolloverAmount || 0));
      const carryover = Math.max(0, prevEffectiveLimit - prevSpent);

      if (carryover !== Number(budget.rolloverAmount)) {
        await budget.update({ rolloverAmount: carryover });
        processedCount++;
      }
    } catch (err) {
      logger.error(`[BudgetRollover] Lỗi budget id=${budget.id}:`, err);
    }
  }

  return { processedCount };
};

/**
 * Tinh cho nhieu budget cung luc — batch query thay vi N+1
 *
 * Thuat toan:
 * 1. Load tat ca budget (1 query)
 * 2. Nhom budget theo khoang thoi gian (from|to) — budget cung period share 1 query
 * 3. Voi moi khoang thoi gian duy nhat: 1 query GROUP BY categoryId lay tong chi tieu
 * 4. Map ket qua tro lai tung budget
 *
 * Ket qua: O(ranges) queries thay vi O(N) queries (N = so budget)
 */
export const calculateBudgetsSummary = async (userId) => {
  const budgets = await Budget.findAll({
    where: { userId, isActive: true },
    include: [{ model: Category, attributes: ["id", "name", "icon", "color"] }],
  });

  if (budgets.length === 0) return [];

  // Buoc 2: nhom budget theo khoang thoi gian
  const rangeMap = new Map(); // key "from|to" -> { from, to, entries[] }
  for (const b of budgets) {
    const { from, to } = getBudgetPeriodRange(b);
    const key = `${from}|${to}`;
    if (!rangeMap.has(key)) rangeMap.set(key, { from, to, entries: [] });
    rangeMap.get(key).entries.push({ budget: b, from, to });
  }

  // Buoc 3: voi moi khoang thoi gian, fetch chi tieu theo categoryId
  const spentMap = new Map(); // budgetId -> { spent, from, to }

  await Promise.all(
    [...rangeMap.values()].map(async ({ from, to, entries }) => {
      const rows = await Transaction.findAll({
        where: {
          userId,
          type: "expense",
          transactionDate: { [Op.between]: [from, to] },
        },
        attributes: [
          "categoryId",
          [fn("SUM", col("amount")), "totalSpent"],
        ],
        group: ["categoryId"],
        raw: true,
      });

      // catId -> spent, totalAllExpenses cho budget khong co categoryId
      const catSpent = new Map();
      let totalAllExpenses = 0;
      for (const r of rows) {
        const amt = Number(r.totalSpent || 0);
        if (r.categoryId !== null) catSpent.set(r.categoryId, amt);
        totalAllExpenses += amt;
      }

      for (const { budget } of entries) {
        const spent = budget.categoryId != null
          ? (catSpent.get(budget.categoryId) || 0)
          : totalAllExpenses;
        spentMap.set(budget.id, { spent, from, to });
      }
    })
  );

  // Buoc 4: map ket qua
  return budgets.map((b) => {
    const { spent = 0, from, to } = spentMap.get(b.id) || {};
    const baseLimit = Number(b.amount);
    const rollover = b.rolloverEnabled ? Math.max(0, Number(b.rolloverAmount || 0)) : 0;
    const limit = baseLimit + rollover;
    const remaining = limit - spent;
    const usedPercent = limit > 0 ? (spent / limit) * 100 : 0;
    return {
      ...b.toJSON(),
      spent,
      limit,
      baseLimit,
      rolloverAmount: rollover,
      remaining,
      usedPercent: Math.round(usedPercent * 100) / 100,
      isExceeded: spent > limit,
      isWarning: usedPercent >= b.warnThreshold,
      periodFrom: from,
      periodTo: to,
    };
  });
};
