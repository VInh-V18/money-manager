/**
 * Service xu ly logic cot loi cua giao dich:
 *   - Tao GD -> cong/tru vi tuong ung
 *   - Sua GD -> hoan tac so du cu, ap dung so du moi
 *   - Xoa GD -> hoan tac so du
 *
 * TAT CA cac ham deu nhan tham so transaction (DB transaction Sequelize)
 * de dam bao tinh atomic. Neu loi giua chung -> rollback toan bo.
 */
import { Op } from "sequelize";
import { Transaction, Wallet, WalletBalanceHistory } from "../models/index.js";
import {
  badRequest,
  notFoundError,
  forbiddenError,
} from "../utils/errors.js";
import { createNotification } from "./notificationService.js";
import { cache } from "../libs/redis.js";

const invalidateAiContext = (userId) => cache.del(`ai:ctx:${userId}`);

const todayDateOnly = () => new Date().toISOString().slice(0, 10);
const daysAgoDateOnly = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

/**
 * Ap dung tac dong cua giao dich len so du vi.
 *   income  -> cong vao vi
 *   expense -> tru khoi vi
 *
 * @param tx instance Transaction da co type, amount, walletId
 * @param sign +1 = ap dung; -1 = hoan tac
 * @param dbTx Sequelize transaction
 */
const writeWalletBalanceHistory = async ({
  userId,
  walletId,
  beforeBalance,
  amountChanged,
  afterBalance,
  reason,
  referenceType,
  referenceId,
  dbTx,
}) => {
  await WalletBalanceHistory.create(
    {
      userId,
      walletId,
      beforeBalance,
      amountChanged,
      afterBalance,
      reason,
      referenceType,
      referenceId,
    },
    { transaction: dbTx }
  );
};

const applyToWallet = async (tx, sign, dbTx, reason = "transaction") => {
  const wallet = await Wallet.findByPk(tx.walletId, {
    transaction: dbTx,
    lock: dbTx.LOCK.UPDATE, // pessimistic lock -> tranh race condition
  });
  if (!wallet) throw notFoundError("Ví không tồn tại");

  const amount = Number(tx.amount);
  const delta =
    tx.type === "income" ? sign * amount : sign * -amount;

  const oldBalance = Number(wallet.balance);
  const newBalance = oldBalance + delta;
  await wallet.update({ balance: newBalance }, { transaction: dbTx });
  await writeWalletBalanceHistory({
    userId: tx.userId,
    walletId: wallet.id,
    beforeBalance: oldBalance,
    amountChanged: delta,
    afterBalance: newBalance,
    reason,
    referenceType: "transaction",
    referenceId: tx.id,
    dbTx,
  });
  const threshold = wallet.lowBalanceThreshold;
  const today = todayDateOnly();
  if (
    threshold !== null &&
    threshold !== undefined &&
    Number(threshold) > 0 &&
    newBalance <= Number(threshold) &&
    wallet.lowBalanceLastNotifiedAt !== today
  ) {
    await createNotification(
      tx.userId,
      {
        type: "low_balance",
        severity: "warning",
        title: "Số dư ví thấp",
        message: `Ví "${wallet.name}" còn ${newBalance}, thấp hơn ngưỡng ${threshold}.`,
        relatedEntity: { entityType: "wallet", entityId: wallet.id },
      },
      dbTx
    );
    await wallet.update({ lowBalanceLastNotifiedAt: today }, { transaction: dbTx });
  }
  return newBalance;
};

/**
 * Kiem tra so du co du khong khi expense
 */
const checkBalance = async (walletId, amount, type, allowNegative, dbTx) => {
  if (type !== "expense" || allowNegative) return;
  const wallet = await Wallet.findByPk(walletId, { transaction: dbTx });
  if (!wallet) throw notFoundError("Ví không tồn tại");
  if (Number(wallet.balance) < Number(amount)) {
    throw badRequest(
      `Số dư không đủ. Ví "${wallet.name}" hiện có ${wallet.balance}, cần ${amount}`
    );
  }
};

const detectAbnormalExpense = async (tx, dbTx) => {
  if (tx.type !== "expense") return;
  const amount = Number(tx.amount);
  const where = {
    id: { [Op.ne]: tx.id },
    userId: tx.userId,
    type: "expense",
    transactionDate: { [Op.gte]: daysAgoDateOnly(90) },
  };
  if (tx.categoryId) where.categoryId = tx.categoryId;

  const [count, total] = await Promise.all([
    Transaction.count({ where, transaction: dbTx }),
    Transaction.sum("amount", { where, transaction: dbTx }),
  ]);
  if (count < 5) return;

  const average = Number(total || 0) / count;
  const isAbnormal = average > 0 && amount >= Math.max(average * 2.5, 100000);
  if (!isAbnormal) return;

  await createNotification(
    tx.userId,
    {
      type: "abnormal_spending",
      severity: "warning",
      title: "Chi tiêu bất thường",
      message: `Khoản chi ${amount} cao hơn mức trung bình ${Math.round(average)} trong 90 ngày gần đây.`,
      relatedEntity: { entityType: "transaction", entityId: tx.id },
    },
    dbTx
  );
};

/**
 * Tao giao dich + cap nhat so du vi (atomic)
 */
export const createTransactionWithBalance = async (
  userId,
  data,
  dbTx,
  { allowNegative = false } = {}
) => {
  // 1. validate vi thuoc user
  const wallet = await Wallet.findByPk(data.walletId, { transaction: dbTx });
  if (!wallet) throw notFoundError("Ví không tồn tại");
  if (wallet.userId !== userId) throw forbiddenError("Ví không thuộc về bạn");

  // 2. check so du
  await checkBalance(
    data.walletId,
    data.amount,
    data.type,
    allowNegative,
    dbTx
  );

  // 3. tao GD
  const tx = await Transaction.create(
    { ...data, userId },
    { transaction: dbTx }
  );

  // 4. cap nhat so du
  await applyToWallet(tx, +1, dbTx, "transaction_create");
  await detectAbnormalExpense(tx, dbTx);
  invalidateAiContext(userId);

  return tx;
};

/**
 * Sua giao dich + cap nhat so du (atomic)
 *   - Hoan tac tac dong cua GD cu (theo wallet/type/amount cu)
 *   - Ap dung tac dong cua GD moi
 *   - Cho phep doi vi (chuyen tu vi A sang vi B)
 */
export const updateTransactionWithBalance = async (
  oldTx,
  newData,
  dbTx,
  { allowNegative = false } = {}
) => {
  // 1. hoan tac GD cu
  await applyToWallet(oldTx, -1, dbTx, "transaction_update_rollback");

  // 2. neu doi vi -> validate vi moi
  const targetWalletId = newData.walletId ?? oldTx.walletId;
  if (targetWalletId !== oldTx.walletId) {
    const newWallet = await Wallet.findByPk(targetWalletId, { transaction: dbTx });
    if (!newWallet) throw notFoundError("Ví mới không tồn tại");
    if (newWallet.userId !== oldTx.userId) {
      throw forbiddenError("Ví mới không thuộc về bạn");
    }
  }

  // 3. check so du voi gia tri MOI (sau khi da hoan tac)
  const newType = newData.type ?? oldTx.type;
  const newAmount = newData.amount ?? oldTx.amount;
  await checkBalance(targetWalletId, newAmount, newType, allowNegative, dbTx);

  // 4. cap nhat fields
  await oldTx.update(newData, { transaction: dbTx });

  // 5. ap dung GD moi
  await applyToWallet(oldTx, +1, dbTx, "transaction_update_apply");
  invalidateAiContext(oldTx.userId);

  return oldTx;
};

/**
 * Xoa giao dich + hoan tac so du
 */
export const deleteTransactionWithBalance = async (tx, dbTx) => {
  const userId = tx.userId;
  await applyToWallet(tx, -1, dbTx, "transaction_delete");
  await tx.destroy({ transaction: dbTx });
  invalidateAiContext(userId);
};

export const restoreTransactionWithBalance = async (tx, dbTx, { allowNegative = true } = {}) => {
  await checkBalance(tx.walletId, tx.amount, tx.type, allowNegative, dbTx);
  await tx.restore({ transaction: dbTx });
  await applyToWallet(tx, +1, dbTx, "transaction_restore");
  return tx;
};

/**
 * Chuyen tien giua 2 vi:
 *   - Tru fromWallet (amount + fee)
 *   - Cong toWallet (amount)
 *   - Tao record WalletTransfer
 *   - Tao 2 GD an de hien thi trong lich su (subType = transfer_fee)
 *
 * Da cu y KHONG tao GD income/expense thuong vi se gay sai bao cao.
 * Chi tao GD an de phuc vu hien thi lich su trong tab Wallet.
 */
export const transferBetweenWallets = async (userId, data, dbTx) => {
  const { fromWalletId, toWalletId, amount, fee = 0, transferDate, note } = data;

  if (fromWalletId === toWalletId) {
    throw badRequest("Ví nguồn và ví đích phải khác nhau");
  }

  const [fromWallet, toWallet] = await Promise.all([
    Wallet.findByPk(fromWalletId, {
      transaction: dbTx,
      lock: dbTx.LOCK.UPDATE,
    }),
    Wallet.findByPk(toWalletId, {
      transaction: dbTx,
      lock: dbTx.LOCK.UPDATE,
    }),
  ]);

  if (!fromWallet || !toWallet) throw notFoundError("Ví không tồn tại");
  if (fromWallet.userId !== userId || toWallet.userId !== userId) {
    throw forbiddenError("Ví không thuộc về bạn");
  }

  const totalDeduct = Number(amount) + Number(fee);
  if (Number(fromWallet.balance) < totalDeduct) {
    throw badRequest(
      `Số dư không đủ. Ví nguồn "${fromWallet.name}" cần ${totalDeduct}`
    );
  }

  // cap nhat so du
  const fromBefore = Number(fromWallet.balance);
  const toBefore = Number(toWallet.balance);
  const fromAfter = fromBefore - totalDeduct;
  const toAfter = toBefore + Number(amount);
  await fromWallet.update(
    { balance: fromAfter },
    { transaction: dbTx }
  );
  await toWallet.update(
    { balance: toAfter },
    { transaction: dbTx }
  );

  // tao record WalletTransfer
  const { WalletTransfer } = await import("../models/index.js");
  const transfer = await WalletTransfer.create(
    {
      userId,
      fromWalletId,
      toWalletId,
      amount,
      fee,
      transferDate,
      note,
    },
    { transaction: dbTx }
  );

  await Promise.all([
    writeWalletBalanceHistory({
      userId,
      walletId: fromWallet.id,
      beforeBalance: fromBefore,
      amountChanged: -totalDeduct,
      afterBalance: fromAfter,
      reason: "wallet_transfer_out",
      referenceType: "wallet_transfer",
      referenceId: transfer.id,
      dbTx,
    }),
    writeWalletBalanceHistory({
      userId,
      walletId: toWallet.id,
      beforeBalance: toBefore,
      amountChanged: Number(amount),
      afterBalance: toAfter,
      reason: "wallet_transfer_in",
      referenceType: "wallet_transfer",
      referenceId: transfer.id,
      dbTx,
    }),
  ]);

  return transfer;
};
