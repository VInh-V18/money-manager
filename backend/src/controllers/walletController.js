import { Op, fn, col } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError } from "../utils/errors.js";
import { Wallet, sequelize, Transaction, WalletBalanceHistory } from "../models/index.js";
import { transferBetweenWallets } from "../services/transactionService.js";
import { writeActivityLog } from "../services/activityLogService.js";

export const listWallets = asyncHandler(async (req, res) => {
  const wallets = await Wallet.findAll({
    where: { userId: req.user.id },
    order: [
      ["isActive", "DESC"],
      ["createdAt", "ASC"],
    ],
  });

  // tinh tong so du (loai vi excludeFromTotal)
  const totalBalance = wallets
    .filter((w) => w.isActive && !w.excludeFromTotal)
    .reduce((sum, w) => sum + Number(w.balance), 0);

  return ok(res, { wallets, totalBalance });
});

export const getWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findByPk(req.params.id);
  if (!wallet) throw notFoundError("Không tìm thấy ví");
  if (wallet.userId !== req.user.id) throw forbiddenError();
  return ok(res, { wallet });
});

export const createWallet = asyncHandler(async (req, res) => {
  // initialBalance = balance ban dau
  const wallet = await Wallet.create({
    ...req.body,
    userId: req.user.id,
    balance: req.body.initialBalance,
  });
  await writeActivityLog({
    userId: req.user.id,
    action: "create",
    entityType: "wallet",
    entityId: wallet.id,
    payload: { newValue: wallet.toJSON() },
    ipAddress: req.ip,
  });
  return created(res, { wallet }, "Tạo ví thành công");
});

export const updateWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findByPk(req.params.id);
  if (!wallet) throw notFoundError("Không tìm thấy ví");
  if (wallet.userId !== req.user.id) throw forbiddenError();

  // KHONG cho update truc tiep balance/initialBalance qua API nay
  // (de dam bao chi co transaction lam thay doi balance)
  const oldValue = wallet.toJSON();
  await wallet.update(req.body);
  await writeActivityLog({
    userId: req.user.id,
    action: "update",
    entityType: "wallet",
    entityId: wallet.id,
    payload: { oldValue, newValue: wallet.toJSON() },
    ipAddress: req.ip,
  });
  return ok(res, { wallet }, "Cập nhật ví thành công");
});

export const deleteWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findByPk(req.params.id);
  if (!wallet) throw notFoundError("Không tìm thấy ví");
  if (wallet.userId !== req.user.id) throw forbiddenError();

  // check con giao dich active khong
  const txCount = await Transaction.count({ where: { walletId: wallet.id } });
  if (txCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Ví này còn ${txCount} giao dịch. Hãy tắt hoạt động thay vì xóa, hoặc xóa các giao dịch trước.`,
    });
  }

  // soft delete (paranoid)
  const oldValue = wallet.toJSON();
  await wallet.destroy();
  await writeActivityLog({
    userId: req.user.id,
    action: "delete",
    entityType: "wallet",
    entityId: wallet.id,
    payload: { oldValue },
    ipAddress: req.ip,
  });
  return ok(res, null, "Đã xóa ví");
});

export const transferMoney = asyncHandler(async (req, res) => {
  const transfer = await sequelize.transaction(async (dbTx) => {
    const createdTransfer = await transferBetweenWallets(req.user.id, req.body, dbTx);
    await writeActivityLog({
      userId: req.user.id,
      action: "transfer",
      entityType: "wallet_transfer",
      entityId: createdTransfer.id,
      payload: { newValue: createdTransfer.toJSON() },
      ipAddress: req.ip,
      transaction: dbTx,
    });
    return createdTransfer;
  });
  return created(res, { transfer }, "Chuyển tiền thành công");
});

export const getWalletHistory = asyncHandler(async (req, res) => {
  const walletId = Number(req.params.id);
  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) throw notFoundError("Không tìm thấy ví");
  if (wallet.userId !== req.user.id) throw forbiddenError();

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const { rows, count } = await Transaction.findAndCountAll({
    where: { userId: req.user.id, walletId },
    order: [
      ["transactionDate", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit,
    offset: (page - 1) * limit,
  });

  return ok(res, {
    items: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

export const getWalletBalanceHistory = asyncHandler(async (req, res) => {
  const walletId = Number(req.params.id);
  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) throw notFoundError("Không tìm thấy ví");
  if (wallet.userId !== req.user.id) throw forbiddenError();

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const { rows, count } = await WalletBalanceHistory.findAndCountAll({
    where: { userId: req.user.id, walletId },
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  return ok(res, {
    items: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});
