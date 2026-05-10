import { Op } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError, badRequest } from "../utils/errors.js";
import { Debt, sequelize } from "../models/index.js";
import { createTransactionWithBalance } from "../services/transactionService.js";
import { formatDate, today } from "../utils/date.js";

const enrichDebt = (d) => ({
  ...d.toJSON(),
  remaining: Number(d.amount) - Number(d.paidAmount),
});

export const listDebts = asyncHandler(async (req, res) => {
  // tu cap nhat trang thai overdue truoc khi tra
  const todayStr = formatDate(today());
  await Debt.update(
    { status: "overdue" },
    {
      where: {
        userId: req.user.id,
        status: "active",
        dueDate: { [Op.lt]: todayStr, [Op.ne]: null },
      },
    }
  );

  const items = await Debt.findAll({
    where: { userId: req.user.id },
    order: [
      ["status", "ASC"],
      ["dueDate", "ASC"],
    ],
  });
  return ok(res, { items: items.map(enrichDebt) });
});

export const getDebt = asyncHandler(async (req, res) => {
  const d = await Debt.findByPk(req.params.id);
  if (!d) throw notFoundError();
  if (d.userId !== req.user.id) throw forbiddenError();
  return ok(res, { debt: enrichDebt(d) });
});

export const createDebt = asyncHandler(async (req, res) => {
  const d = await Debt.create({ ...req.body, userId: req.user.id });
  return created(res, { debt: enrichDebt(d) }, "Tao thanh cong");
});

export const updateDebt = asyncHandler(async (req, res) => {
  const d = await Debt.findByPk(req.params.id);
  if (!d) throw notFoundError();
  if (d.userId !== req.user.id) throw forbiddenError();
  await d.update(req.body);
  return ok(res, { debt: enrichDebt(d) });
});

export const deleteDebt = asyncHandler(async (req, res) => {
  const d = await Debt.findByPk(req.params.id);
  if (!d) throw notFoundError();
  if (d.userId !== req.user.id) throw forbiddenError();
  await d.destroy();
  return ok(res, null, "Da xoa khoan no");
});

/**
 * Tra no:
 *   - Cong them paidAmount
 *   - Neu da tra du -> status = paid
 *   - Neu co walletId -> tao GD expense (minh no nguoi khac) hoac income (nguoi khac no minh)
 */
export const payDebt = asyncHandler(async (req, res) => {
  const d = await Debt.findByPk(req.params.id);
  if (!d) throw notFoundError();
  if (d.userId !== req.user.id) throw forbiddenError();
  if (d.status === "paid") throw badRequest("Khoan no da tra het");

  const { amount, walletId, payDate, note } = req.body;
  const newPaid = Number(d.paidAmount) + Number(amount);
  if (newPaid > Number(d.amount)) {
    throw badRequest(
      `So tien tra (${newPaid}) vuot tong no (${d.amount})`
    );
  }

  await sequelize.transaction(async (dbTx) => {
    await d.update(
      {
        paidAmount: newPaid,
        status: newPaid >= Number(d.amount) ? "paid" : "active",
      },
      { transaction: dbTx }
    );

    // tao GD tuong ung neu chon vi
    if (walletId) {
      const txType = d.type === "owed_by_me" ? "expense" : "income";
      const desc =
        d.type === "owed_by_me"
          ? `Tra no ${d.personName}`
          : `${d.personName} tra no`;
      await createTransactionWithBalance(
        req.user.id,
        {
          walletId,
          type: txType,
          subType: "regular",
          amount,
          description: desc,
          note,
          transactionDate: payDate,
        },
        dbTx
      );
    }
  });

  await d.reload();
  return ok(res, { debt: enrichDebt(d) }, "Da ghi nhan thanh toan");
});
