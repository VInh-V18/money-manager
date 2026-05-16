import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError } from "../utils/errors.js";
import { Budget, Category, Transaction } from "../models/index.js";
import { Op, col, fn } from "sequelize";
import {
  calculateBudgetSpent,
  calculateBudgetsSummary,
} from "../services/budgetService.js";

export const listBudgets = asyncHandler(async (req, res) => {
  const items = await calculateBudgetsSummary(req.user.id);
  return ok(res, { budgets: items });
});

export const getBudgetSummary = asyncHandler(async (req, res) => {
  const items = await calculateBudgetsSummary(req.user.id);
  const totalLimit = items.reduce((s, b) => s + Number(b.limit), 0);
  const totalSpent = items.reduce((s, b) => s + Number(b.spent), 0);
  const exceeded = items.filter((b) => b.isExceeded).length;
  const warning = items.filter((b) => b.isWarning && !b.isExceeded).length;
  return ok(res, {
    totalLimit,
    totalSpent,
    totalRemaining: totalLimit - totalSpent,
    count: items.length,
    exceeded,
    warning,
    items,
  });
});

export const suggestBudgets = asyncHandler(async (req, res) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  const rows = await Transaction.findAll({
    where: {
      userId: req.user.id,
      type: "expense",
      categoryId: { [Op.ne]: null },
      transactionDate: { [Op.between]: [fromDate, toDate] },
    },
    attributes: ["categoryId", [fn("SUM", col("amount")), "spent"], [fn("COUNT", col("id")), "count"]],
    include: [{ model: Category, attributes: ["id", "name", "icon", "color", "type"] }],
    group: ["categoryId", "Category.id", "Category.name", "Category.icon", "Category.color", "Category.type"],
    order: [[fn("SUM", col("amount")), "DESC"]],
    limit: 8,
  });

  const items = rows.map((row) => {
    const spent = Number(row.get("spent")) || 0;
    return {
      categoryId: row.categoryId,
      category: row.Category,
      spent,
      count: Number(row.get("count")) || 0,
      suggestedAmount: Math.max(50000, Math.round((spent * 0.9) / 10000) * 10000),
      reason: "Dua tren chi tieu thang truoc, giam khoang 10% de tang tiet kiem.",
    };
  });

  return ok(res, { items, range: { from: fromDate, to: toDate } });
});

export const getBudget = asyncHandler(async (req, res) => {
  const b = await Budget.findByPk(req.params.id, {
    include: [{ model: Category }],
  });
  if (!b) throw notFoundError("Khong tim thay ngan sach");
  if (b.userId !== req.user.id) throw forbiddenError();
  const calc = await calculateBudgetSpent(b);
  return ok(res, { budget: { ...b.toJSON(), ...calc } });
});

export const createBudget = asyncHandler(async (req, res) => {
  const b = await Budget.create({ ...req.body, userId: req.user.id });
  return created(res, { budget: b }, "Tao ngan sach thanh cong");
});

export const updateBudget = asyncHandler(async (req, res) => {
  const b = await Budget.findByPk(req.params.id);
  if (!b) throw notFoundError("Khong tim thay ngan sach");
  if (b.userId !== req.user.id) throw forbiddenError();
  await b.update(req.body);
  return ok(res, { budget: b }, "Cap nhat ngan sach thanh cong");
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const b = await Budget.findByPk(req.params.id);
  if (!b) throw notFoundError("Khong tim thay ngan sach");
  if (b.userId !== req.user.id) throw forbiddenError();
  await b.destroy();
  return ok(res, null, "Da xoa ngan sach");
});
