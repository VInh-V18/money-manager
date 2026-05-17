import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError } from "../utils/errors.js";
import { FixedExpense, Category, Wallet } from "../models/index.js";
import { generateDueFixedExpenses } from "../services/fixedExpenseService.js";
import { computeNextDueDate, formatDate } from "../utils/date.js";

export const listFixedExpenses = asyncHandler(async (req, res) => {
  const items = await FixedExpense.findAll({
    where: { userId: req.user.id },
    order: [["nextDueDate", "ASC"]],
    include: [
      { model: Wallet, attributes: ["id", "name", "icon", "color"] },
      { model: Category, attributes: ["id", "name", "icon", "color"] },
    ],
  });
  return ok(res, { items });
});

export const getFixedExpense = asyncHandler(async (req, res) => {
  const fe = await FixedExpense.findByPk(req.params.id, {
    include: [{ model: Wallet }, { model: Category }],
  });
  if (!fe) throw notFoundError("Không tìm thấy khoản chi cố định");
  if (fe.userId !== req.user.id) throw forbiddenError();
  return ok(res, { fixedExpense: fe });
});

export const createFixedExpense = asyncHandler(async (req, res) => {
  // tinh nextDueDate khoi tao = startDate
  const data = {
    ...req.body,
    userId: req.user.id,
    nextDueDate: req.body.startDate,
  };
  const fe = await FixedExpense.create(data);
  return created(res, { fixedExpense: fe }, "Tạo thành công");
});

export const updateFixedExpense = asyncHandler(async (req, res) => {
  const fe = await FixedExpense.findByPk(req.params.id);
  if (!fe) throw notFoundError("Không tìm thấy khoản chi cố định");
  if (fe.userId !== req.user.id) throw forbiddenError();

  // neu doi frequency hoac startDate -> reset nextDueDate
  const data = { ...req.body };
  if (req.body.startDate || req.body.frequency || req.body.customIntervalDays) {
    data.nextDueDate = req.body.startDate || fe.startDate;
  }

  await fe.update(data);
  return ok(res, { fixedExpense: fe }, "Cập nhật thành công");
});

export const deleteFixedExpense = asyncHandler(async (req, res) => {
  const fe = await FixedExpense.findByPk(req.params.id);
  if (!fe) throw notFoundError();
  if (fe.userId !== req.user.id) throw forbiddenError();
  await fe.destroy();
  return ok(res, null, "Đã xóa");
});

/**
 * Endpoint chay tay - de test cron logic ngay
 */
export const generateDue = asyncHandler(async (req, res) => {
  const result = await generateDueFixedExpenses(req.user.id);
  return ok(
    res,
    result,
    `Đã xử lý: ${result.generated} GD tạo mới, ${result.warned} cảnh báo`
  );
});
