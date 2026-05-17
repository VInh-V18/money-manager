import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError, badRequest } from "../utils/errors.js";
import {
  ExpenseTemplate,
  Wallet,
  Category,
  sequelize,
} from "../models/index.js";
import { createTransactionWithBalance } from "../services/transactionService.js";
import { formatDate, today } from "../utils/date.js";

export const listTemplates = asyncHandler(async (req, res) => {
  const items = await ExpenseTemplate.findAll({
    where: { userId: req.user.id },
    order: [
      ["isPinned", "DESC"],
      ["usageCount", "DESC"],
      ["sortOrder", "ASC"],
    ],
    include: [
      { model: Wallet, attributes: ["id", "name", "icon", "color"] },
      { model: Category, attributes: ["id", "name", "icon", "color"] },
    ],
  });
  return ok(res, { items });
});

export const getTemplate = asyncHandler(async (req, res) => {
  const t = await ExpenseTemplate.findByPk(req.params.id);
  if (!t) throw notFoundError();
  if (t.userId !== req.user.id) throw forbiddenError();
  return ok(res, { template: t });
});

export const createTemplate = asyncHandler(async (req, res) => {
  const t = await ExpenseTemplate.create({
    ...req.body,
    userId: req.user.id,
  });
  return created(res, { template: t }, "Tạo mẫu chi nhanh thành công");
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const t = await ExpenseTemplate.findByPk(req.params.id);
  if (!t) throw notFoundError();
  if (t.userId !== req.user.id) throw forbiddenError();
  await t.update(req.body);
  return ok(res, { template: t });
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  const t = await ExpenseTemplate.findByPk(req.params.id);
  if (!t) throw notFoundError();
  if (t.userId !== req.user.id) throw forbiddenError();
  await t.destroy();
  return ok(res, null, "Đã xóa");
});

/**
 * Dung mau de tao giao dich nhanh.
 * Body co the override amount/wallet/desc/date; mac dinh dung gia tri tu mau.
 */
export const useTemplate = asyncHandler(async (req, res) => {
  const t = await ExpenseTemplate.findByPk(req.params.id);
  if (!t) throw notFoundError();
  if (t.userId !== req.user.id) throw forbiddenError();

  const walletId = req.body.walletId ?? t.walletId;
  const amount = req.body.amount ?? t.defaultAmount;
  if (!walletId) throw badRequest("Chưa chọn ví");
  if (!amount || Number(amount) <= 0)
    throw badRequest("Số tiền không hợp lệ");

  const tx = await sequelize.transaction(async (dbTx) => {
    const newTx = await createTransactionWithBalance(
      req.user.id,
      {
        walletId,
        categoryId: t.categoryId,
        type: t.type,
        subType: "regular",
        amount,
        description: req.body.description || t.name,
        note: t.defaultNote,
        transactionDate: req.body.transactionDate || formatDate(today()),
      },
      dbTx
    );
    // tang dem su dung
    await t.update({ usageCount: t.usageCount + 1 }, { transaction: dbTx });
    return newTx;
  });

  return created(res, { transaction: tx }, "Đã tạo giao dịch từ mẫu");
});
