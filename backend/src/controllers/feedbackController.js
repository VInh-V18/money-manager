import { Feedback } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, ok } from "../utils/response.js";

export const listFeedback = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const where = { userId: req.user.id };
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;

  const { rows, count } = await Feedback.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
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

export const createFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.create({
    ...req.body,
    userId: req.user.id,
    userAgent: req.headers["user-agent"]?.slice(0, 500),
    ipAddress: req.ip,
  });

  return created(res, { feedback }, "Da gui feedback");
});
