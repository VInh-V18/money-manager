import { Op, fn, col } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError } from "../utils/errors.js";
import { Wallet, sequelize, Transaction } from "../models/index.js";
import { transferBetweenWallets } from "../services/transactionService.js";

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
  if (!wallet) throw notFoundError("Khong tim thay vi");
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
  return created(res, { wallet }, "Tao vi thanh cong");
});

export const updateWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findByPk(req.params.id);
  if (!wallet) throw notFoundError("Khong tim thay vi");
  if (wallet.userId !== req.user.id) throw forbiddenError();

  // KHONG cho update truc tiep balance/initialBalance qua API nay
  // (de dam bao chi co transaction lam thay doi balance)
  await wallet.update(req.body);
  return ok(res, { wallet }, "Cap nhat vi thanh cong");
});

export const deleteWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findByPk(req.params.id);
  if (!wallet) throw notFoundError("Khong tim thay vi");
  if (wallet.userId !== req.user.id) throw forbiddenError();

  // check con giao dich active khong
  const txCount = await Transaction.count({ where: { walletId: wallet.id } });
  if (txCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Vi nay con ${txCount} giao dich. Hay tat hoat dong thay vi xoa, hoac xoa cac giao dich truoc.`,
    });
  }

  // soft delete (paranoid)
  await wallet.destroy();
  return ok(res, null, "Da xoa vi");
});

export const transferMoney = asyncHandler(async (req, res) => {
  const transfer = await sequelize.transaction(async (dbTx) => {
    return transferBetweenWallets(req.user.id, req.body, dbTx);
  });
  return created(res, { transfer }, "Chuyen tien thanh cong");
});

export const getWalletHistory = asyncHandler(async (req, res) => {
  const walletId = Number(req.params.id);
  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) throw notFoundError("Khong tim thay vi");
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
