import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError } from "../utils/errors.js";
import { Budget, Category } from "../models/index.js";
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
