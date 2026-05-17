import crypto from "crypto";
import { Op, col, fn, where as sqlWhere } from "sequelize";
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
  restoreTransactionWithBalance,
} from "../services/transactionService.js";
import { writeActivityLog } from "../services/activityLogService.js";

const transactionInclude = [
  { model: Wallet },
  { model: Category },
];

const getIdempotencyKey = (req, bodyKey) => {
  const headerKey = req.get("Idempotency-Key") || req.get("x-idempotency-key");
  const value = bodyKey || headerKey;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const assertValidIdempotencyKey = (key) => {
  if (!key) return;
  if (key.length < 8 || key.length > 100 || !/^[a-zA-Z0-9:_-]+$/.test(key)) {
    throw badRequest("Idempotency key không hợp lệ");
  }
};

const buildTransactionChecksum = (userId, data) => {
  const payload = {
    userId,
    walletId: Number(data.walletId),
    categoryId: data.categoryId ? Number(data.categoryId) : null,
    type: data.type,
    subType: data.subType || "regular",
    amount: Number(data.amount).toFixed(2),
    description: data.description || "",
    note: data.note || "",
    transactionDate: data.transactionDate,
    transactionTime: data.transactionTime || null,
    receiptUrl: data.receiptUrl || null,
    metadata: data.metadata || null,
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

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
    tag,
    hasReceipt,
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
  if (hasReceipt !== undefined) {
    where.receiptUrl = hasReceipt ? { [Op.ne]: null } : null;
  }
  if (tag) {
    where[Op.and] = [
      ...(where[Op.and] || []),
      sqlWhere(fn("JSON_SEARCH", col("metadata"), "one", tag, null, "$.tags[*]"), {
        [Op.ne]: null,
      }),
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
  if (!tx) throw notFoundError("Không tìm thấy giao dịch");
  if (tx.userId !== req.user.id) throw forbiddenError();
  return ok(res, { transaction: tx });
});

export const uploadTransactionReceipt = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest("Vui lòng chọn ảnh hóa đơn");
  }
  const receiptUrl = `/uploads/${req.file.filename}`;
  return ok(res, { receiptUrl }, "Đã tải ảnh hóa đơn");
});

export const scanReceiptOcr = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest("Vui lòng chọn ảnh hóa đơn");
  const { scanReceiptOcrService } = await import("../services/aiService.js");
  const result = await scanReceiptOcrService(req.file.path);
  return ok(res, result, "Đã phân tích hóa đơn");
});

export const listDeletedTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const { rows, count } = await Transaction.findAndCountAll({
    where: {
      userId: req.user.id,
      deletedAt: { [Op.ne]: null },
    },
    paranoid: false,
    order: [["deletedAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
    include: transactionInclude,
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

// ===== Tao giao dich (logic chinh) =====
export const createTransaction = asyncHandler(async (req, res) => {
  const { allowNegative, idempotencyKey: bodyIdempotencyKey, ...data } = req.body;
  const idempotencyKey = getIdempotencyKey(req, bodyIdempotencyKey);
  assertValidIdempotencyKey(idempotencyKey);

  if (idempotencyKey) {
    const existing = await Transaction.findOne({
      where: { userId: req.user.id, idempotencyKey },
      include: transactionInclude,
    });
    if (existing) {
      return ok(
        res,
        { transaction: existing, idempotent: true },
        "Giao dịch đã tồn tại"
      );
    }
  }

  data.idempotencyKey = idempotencyKey;
  data.checksum = buildTransactionChecksum(req.user.id, data);

  // validate categoryId neu co
  if (data.categoryId) {
    const cat = await Category.findByPk(data.categoryId);
    if (!cat || cat.userId !== req.user.id) {
      throw badRequest("Danh mục không hợp lệ");
    }
    if (cat.type !== data.type) {
      throw badRequest(
        `Danh mục "${cat.name}" là ${cat.type === "income" ? "thu" : "chi"}, không khớp với loại giao dịch`
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
    include: transactionInclude,
  });
  return created(res, { transaction: full }, "Tạo giao dịch thành công");
});

// ===== Sua giao dich =====
export const updateTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findByPk(req.params.id);
  if (!tx) throw notFoundError("Không tìm thấy giao dịch");
  if (tx.userId !== req.user.id) throw forbiddenError();

  const { allowNegative, ...data } = req.body;

  // validate categoryId neu co
  if (data.categoryId) {
    const cat = await Category.findByPk(data.categoryId);
    if (!cat || cat.userId !== req.user.id) {
      throw badRequest("Danh mục không hợp lệ");
    }
    const newType = data.type ?? tx.type;
    if (cat.type !== newType) {
      throw badRequest(
        `Danh mục "${cat.name}" không khớp với loại giao dịch`
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
  return ok(res, { transaction: full }, "Cập nhật giao dịch thành công");
});

// ===== Xoa giao dich =====
export const deleteTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findByPk(req.params.id);
  if (!tx) throw notFoundError("Không tìm thấy giao dịch");
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
  return ok(res, null, "Đã xóa giao dịch và hoàn tác số dư");
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
    throw badRequest("Một số giao dịch không tồn tại hoặc không thuộc về bạn");
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
    `Đã xóa ${transactions.length} giao dịch và hoàn tác số dư`
  );
});

export const restoreTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findByPk(req.params.id, { paranoid: false });
  if (!tx) throw notFoundError("Không tìm thấy giao dịch");
  if (tx.userId !== req.user.id) throw forbiddenError();
  if (!tx.deletedAt) throw badRequest("Giao dịch chưa bị xóa");

  await sequelize.transaction(async (dbTx) => {
    const oldValue = tx.toJSON();
    await restoreTransactionWithBalance(tx, dbTx);
    await writeActivityLog({
      userId: req.user.id,
      action: "restore",
      entityType: "transaction",
      entityId: tx.id,
      payload: { oldValue, newValue: tx.toJSON() },
      ipAddress: req.ip,
      transaction: dbTx,
    });
  });

  const full = await Transaction.findByPk(tx.id, {
    include: transactionInclude,
  });
  return ok(res, { transaction: full }, "Đã khôi phục giao dịch");
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
        description: description || `Công nhật ${numberOfDays} ngày`,
        transactionDate: startDate,
        metadata: { dailyRate, numberOfDays, startDate },
      },
      dbTx
    );
  });

  return created(res, { transaction: tx }, "Đã ghi nhận thu nhập theo ngày");
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
        description: description || `Làm ${numberOfHours}h`,
        transactionDate: workDate,
        metadata: { hourlyRate, numberOfHours, shift },
      },
      dbTx
    );
  });

  return created(res, { transaction: tx }, "Đã ghi nhận thu nhập theo giờ");
});
