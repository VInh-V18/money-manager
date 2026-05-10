import { Op, fn, col } from "sequelize";
import { Budget, Transaction, Category } from "../models/index.js";
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
  const limit = Number(budget.amount);
  const remaining = limit - spent;
  const usedPercent = limit > 0 ? (spent / limit) * 100 : 0;

  return {
    spent,
    limit,
    remaining,
    usedPercent: Math.round(usedPercent * 100) / 100,
    isExceeded: spent > limit,
    isWarning: usedPercent >= budget.warnThreshold,
    periodFrom: from,
    periodTo: to,
  };
};

/**
 * Tinh cho nhieu budget cung luc
 */
export const calculateBudgetsSummary = async (userId) => {
  const budgets = await Budget.findAll({
    where: { userId, isActive: true },
    include: [{ model: Category, attributes: ["id", "name", "icon", "color"] }],
  });

  const items = await Promise.all(
    budgets.map(async (b) => {
      const calc = await calculateBudgetSpent(b);
      return { ...b.toJSON(), ...calc };
    })
  );

  return items;
};
