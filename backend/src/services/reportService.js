import { Op, fn, col, literal } from "sequelize";
import {
  Transaction,
  Wallet,
  Category,
  Budget,
  FixedExpense,
} from "../models/index.js";
import {
  formatDate,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  startOfYear,
  addDays,
  today,
} from "../utils/date.js";

const sumWhere = async (userId, type, fromDate, toDate) => {
  const r = await Transaction.findOne({
    where: {
      userId,
      type,
      transactionDate: { [Op.between]: [fromDate, toDate] },
    },
    attributes: [[fn("SUM", col("amount")), "total"]],
    raw: true,
  });
  return Number(r?.total || 0);
};

/**
 * Du lieu tong hop cho dashboard
 */
export const getOverview = async (userId) => {
  const todayStr = formatDate(today());
  const monthFrom = formatDate(startOfMonth());
  const monthTo = formatDate(endOfMonth());

  const [
    wallets,
    todayIncome,
    todayExpense,
    monthIncome,
    monthExpense,
    recentTx,
  ] = await Promise.all([
    Wallet.findAll({ where: { userId, isActive: true } }),
    sumWhere(userId, "income", todayStr, todayStr),
    sumWhere(userId, "expense", todayStr, todayStr),
    sumWhere(userId, "income", monthFrom, monthTo),
    sumWhere(userId, "expense", monthFrom, monthTo),
    Transaction.findAll({
      where: { userId },
      order: [
        ["transactionDate", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: 10,
      include: [
        { model: Wallet, attributes: ["id", "name", "icon", "color"] },
        { model: Category, attributes: ["id", "name", "icon", "color"] },
      ],
    }),
  ]);

  const totalBalance = wallets
    .filter((w) => !w.excludeFromTotal)
    .reduce((s, w) => s + Number(w.balance), 0);

  const monthNet = monthIncome - monthExpense;
  const savingRate = monthIncome > 0 ? (monthNet / monthIncome) * 100 : 0;

  // ngay con lai trong thang -> goi y muc chi toi da/ngay
  const daysLeft = Math.max(
    1,
    Math.ceil((endOfMonth() - new Date()) / (1000 * 60 * 60 * 24))
  );

  return {
    totalBalance,
    todayIncome,
    todayExpense,
    monthIncome,
    monthExpense,
    monthNet,
    savingRate: Math.round(savingRate * 100) / 100,
    daysLeftInMonth: daysLeft,
    suggestedDailySpend:
      monthNet > 0 ? Math.round(monthNet / daysLeft) : 0,
    recentTransactions: recentTx,
  };
};

/**
 * Bao cao theo khoang thoi gian
 */
export const getReportByRange = async (userId, fromDate, toDate, opts = {}) => {
  const where = {
    userId,
    transactionDate: { [Op.between]: [fromDate, toDate] },
  };
  if (opts.walletId) where.walletId = opts.walletId;
  if (opts.categoryId) where.categoryId = opts.categoryId;

  // tong thu chi
  const totals = await Transaction.findAll({
    where,
    attributes: [
      "type",
      [fn("SUM", col("amount")), "total"],
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["type"],
    raw: true,
  });

  let income = 0,
    expense = 0,
    incomeCount = 0,
    expenseCount = 0;
  totals.forEach((t) => {
    if (t.type === "income") {
      income = Number(t.total);
      incomeCount = Number(t.count);
    } else {
      expense = Number(t.total);
      expenseCount = Number(t.count);
    }
  });

  // theo danh muc
  const byCategory = await Transaction.findAll({
    where,
    attributes: [
      "categoryId",
      "type",
      [fn("SUM", col("amount")), "total"],
      [fn("COUNT", col("Transaction.id")), "count"],
    ],
    group: ["categoryId", "type", "Category.id"],
    include: [
      {
        model: Category,
        attributes: ["id", "name", "icon", "color"],
      },
    ],
    order: [[literal("total"), "DESC"]],
    raw: false,
  });

  // top 5 giao dich lon nhat
  const topTx = await Transaction.findAll({
    where: { ...where, type: "expense" },
    order: [["amount", "DESC"]],
    limit: 5,
    include: [
      { model: Wallet, attributes: ["id", "name"] },
      { model: Category, attributes: ["id", "name", "icon", "color"] },
    ],
  });

  return {
    range: { from: fromDate, to: toDate },
    summary: {
      income,
      expense,
      net: income - expense,
      incomeCount,
      expenseCount,
      savingRate: income > 0 ? Math.round(((income - expense) / income) * 10000) / 100 : 0,
    },
    byCategory: byCategory.map((row) => ({
      categoryId: row.categoryId,
      type: row.type,
      total: Number(row.get("total")),
      count: Number(row.get("count")),
      category: row.Category,
    })),
    topTransactions: topTx,
  };
};

/**
 * Thong ke theo ngay trong khoang (cho line/bar chart)
 */
export const getDailyStats = async (userId, fromDate, toDate) => {
  const rows = await Transaction.findAll({
    where: {
      userId,
      transactionDate: { [Op.between]: [fromDate, toDate] },
    },
    attributes: [
      "transactionDate",
      "type",
      [fn("SUM", col("amount")), "total"],
    ],
    group: ["transactionDate", "type"],
    order: [["transactionDate", "ASC"]],
    raw: true,
  });

  // build map: date -> { income, expense }
  const map = {};
  rows.forEach((r) => {
    const d = r.transactionDate;
    if (!map[d]) map[d] = { date: d, income: 0, expense: 0 };
    map[d][r.type] = Number(r.total);
  });

  // fill mang ngay (de chart khong bi gap)
  const result = [];
  let cur = new Date(fromDate);
  const end = new Date(toDate);
  while (cur <= end) {
    const d = formatDate(cur);
    result.push(map[d] || { date: d, income: 0, expense: 0 });
    cur = addDays(cur, 1);
  }
  return result;
};

/**
 * So sanh thang nay vs thang truoc
 */
export const getMonthlyComparison = async (userId) => {
  const now = new Date();
  const thisFrom = formatDate(startOfMonth(now));
  const thisTo = formatDate(endOfMonth(now));
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastFrom = formatDate(startOfMonth(lastMonth));
  const lastTo = formatDate(endOfMonth(lastMonth));

  const [thisIncome, thisExpense, lastIncome, lastExpense] = await Promise.all([
    sumWhere(userId, "income", thisFrom, thisTo),
    sumWhere(userId, "expense", thisFrom, thisTo),
    sumWhere(userId, "income", lastFrom, lastTo),
    sumWhere(userId, "expense", lastFrom, lastTo),
  ]);

  const pct = (cur, prev) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 10000) / 100;

  return {
    current: { income: thisIncome, expense: thisExpense, range: { from: thisFrom, to: thisTo } },
    previous: { income: lastIncome, expense: lastExpense, range: { from: lastFrom, to: lastTo } },
    change: {
      income: pct(thisIncome, lastIncome),
      expense: pct(thisExpense, lastExpense),
    },
  };
};

/**
 * Du bao cuoi thang dua tren toc do chi tieu trung binh
 */
export const getForecast = async (userId) => {
  const monthFrom = formatDate(startOfMonth());
  const todayStr = formatDate(today());
  const monthTo = formatDate(endOfMonth());

  const dayPassed = Math.max(
    1,
    Math.ceil((today() - startOfMonth()) / (1000 * 60 * 60 * 24)) + 1
  );
  const totalDaysInMonth = Math.ceil(
    (endOfMonth() - startOfMonth()) / (1000 * 60 * 60 * 24)
  ) + 1;
  const daysLeft = totalDaysInMonth - dayPassed;

  const expense = await sumWhere(userId, "expense", monthFrom, todayStr);
  const income = await sumWhere(userId, "income", monthFrom, todayStr);

  const avgDailyExpense = expense / dayPassed;
  const projectedMonthExpense = expense + avgDailyExpense * daysLeft;

  return {
    monthExpenseSoFar: expense,
    monthIncomeSoFar: income,
    avgDailyExpense: Math.round(avgDailyExpense),
    daysPassed: dayPassed,
    daysLeft: Math.max(0, daysLeft),
    projectedMonthExpense: Math.round(projectedMonthExpense),
    projectedRemainingByMonthEnd: Math.round(income - projectedMonthExpense),
  };
};
