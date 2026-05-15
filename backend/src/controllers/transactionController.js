import { Op } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError, badRequest } from "../utils/errors.js";
import {
  Transaction,
  Wallet,
  Category,
  sequelize,
} from "../models/index.js";
import {
  createTransactionWithBalance,
  updateTransactionWithBalance,
  deleteTransactionWithBalance,
} from "../services/transactionService.js";
import { writeActivityLog } from "../services/activityLogService.js";

// ===== Liet ke voi filter + pagination =====
export const listTransactions = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    type,
    walletId,
    categoryId,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    search,
    sortBy,
    sortDir,
  } = req.query;

  const where = { userId: req.user.id };
  if (type) where.type = type;
  if (walletId) where.walletId = walletId;
  if (categoryId) where.categoryId = categoryId;
  if (fromDate || toDate) {
    where.transactionDate = {};
    if (fromDate) where.transactionDate[Op.gte] = fromDate;
    if (toDate) where.transactionDate[Op.lte] = toDate;
  }
  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount[Op.gte] = minAmount;
    if (maxAmount !== undefined) where.amount[Op.lte] = maxAmount;
  }
  if (search) {
    where[Op.or] = [
      { description: { [Op.like]: `%${search}%` } },
      { note: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Transaction.findAndCountAll({
    where,
    order: [
      [sortBy, sortDir.toUpperCase()],
      ["createdAt", "DESC"],
    ],
    limit,
    offset: (page - 1) * limit,
    include: [
      { model: Wallet, attributes: ["id", "name", "icon", "color", "type"] },
      { model: Category, attributes: ["id", "name", "icon", "color", "type"] },
    ],
  });

  return ok(res, {
    items: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
});

export const getRecentTransactions = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const items = await Transaction.findAll({
    where: { userId: req.user.id },
    order: [
      ["transactionDate", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit,
    include: [
      { model: Wallet, attributes: ["id", "name", "icon", "color"] },
      { model: Category, attributes: ["id", "name", "icon", "color"] },
    ],
  });
  return ok(res, { items });
});

export const searchTransactions = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return ok(res, { items: [] });
  const items = await Transaction.findAll({
    where: {
      userId: req.user.id,
      [Op.or]: [
        { description: { [Op.like]: `%${q}%` } },
        { note: { [Op.like]: `%${q}%` } },
      ],
    },
    limit: 50,
    order: [["transactionDate", "DESC"]],
    include: [
      { model: Wallet, attributes: ["id", "name", "icon", "color"] },
      { model: Category, attributes: ["id", "name", "icon", "color"] },
    ],
  });
  return ok(res, { items });
});

export const getTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findByPk(req.params.id, {
    include: [{ model: Wallet }, { model: Category }],
  });
  if (!tx) throw notFoundError("Khong tim thay giao dich");
  if (tx.userId !== req.user.id) throw forbiddenError();
  return ok(res, { transaction: tx });
});

// ===== Tao giao dich (logic chinh) =====
export const createTransaction = asyncHandler(async (req, res) => {
  const { allowNegative, ...data } = req.body;

  // validate categoryId neu co
  if (data.categoryId) {
    const cat = await Category.findByPk(data.categoryId);
    if (!cat || cat.userId !== req.user.id) {
      throw badRequest("Danh muc khong hop le");
    }
    if (cat.type !== data.type) {
      throw badRequest(
        `Danh muc "${cat.name}" la ${cat.type === "income" ? "thu" : "chi"}, khong khop voi loai giao dich`
      );
    }
  }

  const tx = await sequelize.transaction(async (dbTx) => {
    const createdTx = await createTransactionWithBalance(req.user.id, data, dbTx, {
      allowNegative,
    });
    await writeActivityLog({
      userId: req.user.id,
      action: "create",
      entityType: "transaction",
      entityId: createdTx.id,
      payload: { newValue: createdTx.toJSON() },
      ipAddress: req.ip,
      transaction: dbTx,
    });
    return createdTx;
  });

  // load lai voi association de tra ve frontend
  const full = await Transaction.findByPk(tx.id, {
    include: [{ model: Wallet }, { model: Category }],
  });
  return created(res, { transaction: full }, "Tao giao dich thanh cong");
});

// ===== Sua giao dich =====
export const updateTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findByPk(req.params.id);
  if (!tx) throw notFoundError("Khong tim thay giao dich");
  if (tx.userId !== req.user.id) throw forbiddenError();

  const { allowNegative, ...data } = req.body;

  // validate categoryId neu co
  if (data.categoryId) {
    const cat = await Category.findByPk(data.categoryId);
    if (!cat || cat.userId !== req.user.id) {
      throw badRequest("Danh muc khong hop le");
    }
    const newType = data.type ?? tx.type;
    if (cat.type !== newType) {
      throw badRequest(
        `Danh muc "${cat.name}" khong khop voi loai giao dich`
      );
    }
  }

  await sequelize.transaction(async (dbTx) => {
    const oldValue = tx.toJSON();
    await updateTransactionWithBalance(tx, data, dbTx, { allowNegative });
    await writeActivityLog({
      userId: req.user.id,
      action: "update",
      entityType: "transaction",
      entityId: tx.id,
      payload: { oldValue, newValue: tx.toJSON() },
      ipAddress: req.ip,
      transaction: dbTx,
    });
  });

  const full = await Transaction.findByPk(tx.id, {
    include: [{ model: Wallet }, { model: Category }],
  });
  return ok(res, { transaction: full }, "Cap nhat giao dich thanh cong");
});

// ===== Xoa giao dich =====
export const deleteTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findByPk(req.params.id);
  if (!tx) throw notFoundError("Khong tim thay giao dich");
  if (tx.userId !== req.user.id) throw forbiddenError();

  await sequelize.transaction(async (dbTx) => {
    const oldValue = tx.toJSON();
    await deleteTransactionWithBalance(tx, dbTx);
    await writeActivityLog({
      userId: req.user.id,
      action: "delete",
      entityType: "transaction",
      entityId: tx.id,
      payload: { oldValue },
      ipAddress: req.ip,
      transaction: dbTx,
    });
  });
  return ok(res, null, "Da xoa giao dich va hoan tac so du");
});

// ===== Xoa nhieu giao dich =====
export const deleteTransactionsBulk = asyncHandler(async (req, res) => {
  const ids = [...new Set(req.body.ids.map(Number))];
  const transactions = await Transaction.findAll({
    where: {
      id: { [Op.in]: ids },
      userId: req.user.id,
    },
    order: [["id", "ASC"]],
  });

  if (transactions.length !== ids.length) {
    throw badRequest("Mot so giao dich khong ton tai hoac khong thuoc ve ban");
  }

  await sequelize.transaction(async (dbTx) => {
    for (const tx of transactions) {
      const oldValue = tx.toJSON();
      await deleteTransactionWithBalance(tx, dbTx);
      await writeActivityLog({
        userId: req.user.id,
        action: "delete",
        entityType: "transaction",
        entityId: tx.id,
        payload: { oldValue, bulk: true },
        ipAddress: req.ip,
        transaction: dbTx,
      });
    }
  });

  return ok(
    res,
    { deletedCount: transactions.length },
    `Da xoa ${transactions.length} giao dich va hoan tac so du`
  );
});

// ===== Helper: thu nhap theo ngay =====
export const createDailyWage = asyncHandler(async (req, res) => {
  const { walletId, categoryId, dailyRate, numberOfDays, startDate, description } = req.body;
  const totalAmount = Number(dailyRate) * Number(numberOfDays);

  const tx = await sequelize.transaction(async (dbTx) => {
    return createTransactionWithBalance(
      req.user.id,
      {
        walletId,
        categoryId,
        type: "income",
        subType: "daily_wage",
        amount: totalAmount,
        description: description || `Cong nhat ${numberOfDays} ngay`,
        transactionDate: startDate,
        metadata: { dailyRate, numberOfDays, startDate },
      },
      dbTx
    );
  });

  return created(res, { transaction: tx }, "Da ghi nhan thu nhap theo ngay");
});

// ===== Helper: thu nhap theo gio =====
export const createHourlyWage = asyncHandler(async (req, res) => {
  const { walletId, categoryId, hourlyRate, numberOfHours, workDate, shift, description } = req.body;
  const totalAmount = Number(hourlyRate) * Number(numberOfHours);

  const tx = await sequelize.transaction(async (dbTx) => {
    return createTransactionWithBalance(
      req.user.id,
      {
        walletId,
        categoryId,
        type: "income",
        subType: "hourly_wage",
        amount: totalAmount,
        description: description || `Lam ${numberOfHours}h`,
        transactionDate: workDate,
        metadata: { hourlyRate, numberOfHours, shift },
      },
      dbTx
    );
  });

  return created(res, { transaction: tx }, "Da ghi nhan thu nhap theo gio");
});
