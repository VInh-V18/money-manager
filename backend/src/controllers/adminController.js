import { Op, fn, col } from "sequelize";
import {
  ActivityLog,
  Feedback,
  LoginHistory,
  Transaction,
  User,
  Wallet,
} from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { notFoundError } from "../utils/errors.js";

const paginate = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
};

export const dashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    newUsersToday,
    totalTransactions,
    totalWallets,
    openFeedback,
    failedLoginsToday,
  ] = await Promise.all([
    User.count(),
    User.count({ where: { createdAt: { [Op.gte]: today } } }),
    Transaction.count({ paranoid: false }),
    Wallet.count({ paranoid: false }),
    Feedback.count({ where: { status: "open" } }),
    LoginHistory.count({
      where: {
        status: { [Op.ne]: "SUCCESS" },
        createdAt: { [Op.gte]: today },
      },
    }),
  ]);

  return ok(res, {
    totalUsers,
    newUsersToday,
    totalTransactions,
    totalWallets,
    openFeedback,
    failedLoginsToday,
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const where = {};
  if (req.query.q) {
    where[Op.or] = [
      { email: { [Op.like]: `%${req.query.q}%` } },
      { username: { [Op.like]: `%${req.query.q}%` } },
      { displayName: { [Op.like]: `%${req.query.q}%` } },
    ];
  }
  if (req.query.role) where.role = req.query.role;

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ["hashedPassword"] },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return ok(res, {
    items: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw notFoundError("Không tìm thấy user");
  await user.update({ role: req.body.role });
  const safe = user.toJSON();
  delete safe.hashedPassword;
  return ok(res, { user: safe }, "Đã cập nhật role");
});

export const listFeedback = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;

  const { rows, count } = await Feedback.findAndCountAll({
    where,
    include: [{ model: User, attributes: ["id", "email", "displayName"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
  return ok(res, {
    items: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findByPk(req.params.id);
  if (!feedback) throw notFoundError("Không tìm thấy feedback");
  await feedback.update({ status: req.body.status });
  return ok(res, { feedback }, "Đã cập nhật feedback");
});

export const listSystemLogs = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const { rows, count } = await ActivityLog.findAndCountAll({
    include: [{ model: User, attributes: ["id", "email", "displayName"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
  return ok(res, {
    items: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

export const userGrowth = asyncHandler(async (req, res) => {
  const rows = await User.findAll({
    attributes: [[fn("DATE", col("createdAt")), "date"], [fn("COUNT", col("id")), "count"]],
    group: [fn("DATE", col("createdAt"))],
    order: [[fn("DATE", col("createdAt")), "DESC"]],
    limit: 30,
    raw: true,
  });
  return ok(res, { items: rows.reverse() });
});
