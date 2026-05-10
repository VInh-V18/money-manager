/**
 * Service xu ly logic cot loi cua giao dich:
 *   - Tao GD -> cong/tru vi tuong ung
 *   - Sua GD -> hoan tac so du cu, ap dung so du moi
 *   - Xoa GD -> hoan tac so du
 *
 * TAT CA cac ham deu nhan tham so transaction (DB transaction Sequelize)
 * de dam bao tinh atomic. Neu loi giua chung -> rollback toan bo.
 */
import { Transaction, Wallet } from "../models/index.js";
import {
  badRequest,
  notFoundError,
  forbiddenError,
} from "../utils/errors.js";

/**
 * Ap dung tac dong cua giao dich len so du vi.
 *   income  -> cong vao vi
 *   expense -> tru khoi vi
 *
 * @param tx instance Transaction da co type, amount, walletId
 * @param sign +1 = ap dung; -1 = hoan tac
 * @param dbTx Sequelize transaction
 */
const applyToWallet = async (tx, sign, dbTx) => {
  const wallet = await Wallet.findByPk(tx.walletId, {
    transaction: dbTx,
    lock: dbTx.LOCK.UPDATE, // pessimistic lock -> tranh race condition
  });
  if (!wallet) throw notFoundError("Vi khong ton tai");

  const amount = Number(tx.amount);
  const delta =
    tx.type === "income" ? sign * amount : sign * -amount;

  const newBalance = Number(wallet.balance) + delta;
  await wallet.update({ balance: newBalance }, { transaction: dbTx });
  return newBalance;
};

/**
 * Kiem tra so du co du khong khi expense
 */
const checkBalance = async (walletId, amount, type, allowNegative, dbTx) => {
  if (type !== "expense" || allowNegative) return;
  const wallet = await Wallet.findByPk(walletId, { transaction: dbTx });
  if (!wallet) throw notFoundError("Vi khong ton tai");
  if (Number(wallet.balance) < Number(amount)) {
    throw badRequest(
      `So du khong du. Vi "${wallet.name}" hien co ${wallet.balance}, can ${amount}`
    );
  }
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
  if (!wallet) throw notFoundError("Vi khong ton tai");
  if (wallet.userId !== userId) throw forbiddenError("Vi khong thuoc ve ban");

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
  await applyToWallet(tx, +1, dbTx);

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
  await applyToWallet(oldTx, -1, dbTx);

  // 2. neu doi vi -> validate vi moi
  const targetWalletId = newData.walletId ?? oldTx.walletId;
  if (targetWalletId !== oldTx.walletId) {
    const newWallet = await Wallet.findByPk(targetWalletId, { transaction: dbTx });
    if (!newWallet) throw notFoundError("Vi moi khong ton tai");
    if (newWallet.userId !== oldTx.userId) {
      throw forbiddenError("Vi moi khong thuoc ve ban");
    }
  }

  // 3. check so du voi gia tri MOI (sau khi da hoan tac)
  const newType = newData.type ?? oldTx.type;
  const newAmount = newData.amount ?? oldTx.amount;
  await checkBalance(targetWalletId, newAmount, newType, allowNegative, dbTx);

  // 4. cap nhat fields
  await oldTx.update(newData, { transaction: dbTx });

  // 5. ap dung GD moi
  await applyToWallet(oldTx, +1, dbTx);

  return oldTx;
};

/**
 * Xoa giao dich + hoan tac so du
 */
export const deleteTransactionWithBalance = async (tx, dbTx) => {
  await applyToWallet(tx, -1, dbTx);
  await tx.destroy({ transaction: dbTx });
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
    throw badRequest("Vi nguon va vi dich phai khac nhau");
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

  if (!fromWallet || !toWallet) throw notFoundError("Vi khong ton tai");
  if (fromWallet.userId !== userId || toWallet.userId !== userId) {
    throw forbiddenError("Vi khong thuoc ve ban");
  }

  const totalDeduct = Number(amount) + Number(fee);
  if (Number(fromWallet.balance) < totalDeduct) {
    throw badRequest(
      `So du khong du. Vi nguon "${fromWallet.name}" can ${totalDeduct}`
    );
  }

  // cap nhat so du
  await fromWallet.update(
    { balance: Number(fromWallet.balance) - totalDeduct },
    { transaction: dbTx }
  );
  await toWallet.update(
    { balance: Number(toWallet.balance) + Number(amount) },
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

  return transfer;
};
