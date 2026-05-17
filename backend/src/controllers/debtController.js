import { Op } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError, badRequest } from "../utils/errors.js";
import { Debt, sequelize } from "../models/index.js";
import { createTransactionWithBalance } from "../services/transactionService.js";
import { formatDate, today } from "../utils/date.js";

/**
 * Tinh lai don gian: I = P * r * t (r = %/nam, t = nam)
 * Tinh lai kep: A = P * (1 + r)^t - P
 */
const calcInterest = (principal, ratePercent, interestType, borrowedDate) => {
  if (!ratePercent || !interestType || interestType === "none") return 0;
  const r = Number(ratePercent) / 100;
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const t = (Date.now() - new Date(borrowedDate).getTime()) / msPerYear;
  if (t <= 0) return 0;
  if (interestType === "simple") return Math.round(Number(principal) * r * t);
  if (interestType === "compound") return Math.round(Number(principal) * (Math.pow(1 + r, t) - 1));
  return 0;
};

const enrichDebt = (d) => {
  const interest = calcInterest(d.amount, d.interestRate, d.interestType, d.borrowedDate);
  const totalWithInterest = Number(d.amount) + interest;
  return {
    ...d.toJSON(),
    remaining: Number(d.amount) - Number(d.paidAmount),
    interest,
    totalWithInterest,
    remainingWithInterest: Math.max(0, totalWithInterest - Number(d.paidAmount)),
  };
};

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
  return created(res, { debt: enrichDebt(d) }, "Tạo thành công");
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
  return ok(res, null, "Đã xóa khoản nợ");
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
  if (d.status === "paid") throw badRequest("Khoản nợ đã trả hết");

  const { amount, walletId, payDate, note } = req.body;
  const newPaid = Number(d.paidAmount) + Number(amount);
  if (newPaid > Number(d.amount)) {
    throw badRequest(
      `Số tiền trả (${newPaid}) vượt tổng nợ (${d.amount})`
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
  return ok(res, { debt: enrichDebt(d) }, "Đã ghi nhận thanh toán");
});
