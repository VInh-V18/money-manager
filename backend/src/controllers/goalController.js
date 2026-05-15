import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError, badRequest } from "../utils/errors.js";
import { FinancialGoal } from "../models/index.js";
import { createNotification } from "../services/notificationService.js";

const enrichGoal = (g) => {
  const target = Number(g.targetAmount);
  const current = Number(g.currentAmount);
  const remaining = target - current;
  const progress = target > 0 ? (current / target) * 100 : 0;
  let daysLeft = null;
  let suggestedDaily = null;
  if (g.targetDate) {
    daysLeft = Math.max(
      0,
      Math.ceil((new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
    );
    if (daysLeft > 0 && remaining > 0) {
      suggestedDaily = Math.ceil(remaining / daysLeft);
    }
  }
  return {
    ...g.toJSON(),
    progress: Math.round(progress * 100) / 100,
    remaining,
    daysLeft,
    suggestedDaily,
  };
};

export const listGoals = asyncHandler(async (req, res) => {
  const goals = await FinancialGoal.findAll({
    where: { userId: req.user.id },
    order: [
      ["status", "ASC"],
      ["targetDate", "ASC"],
    ],
  });
  return ok(res, { items: goals.map(enrichGoal) });
});

export const getGoal = asyncHandler(async (req, res) => {
  const g = await FinancialGoal.findByPk(req.params.id);
  if (!g) throw notFoundError();
  if (g.userId !== req.user.id) throw forbiddenError();
  return ok(res, { goal: enrichGoal(g) });
});

export const createGoal = asyncHandler(async (req, res) => {
  const g = await FinancialGoal.create({ ...req.body, userId: req.user.id });
  return created(res, { goal: enrichGoal(g) }, "Tao muc tieu thanh cong");
});

export const updateGoal = asyncHandler(async (req, res) => {
  const g = await FinancialGoal.findByPk(req.params.id);
  if (!g) throw notFoundError();
  if (g.userId !== req.user.id) throw forbiddenError();
  await g.update(req.body);
  return ok(res, { goal: enrichGoal(g) }, "Cap nhat thanh cong");
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const g = await FinancialGoal.findByPk(req.params.id);
  if (!g) throw notFoundError();
  if (g.userId !== req.user.id) throw forbiddenError();
  await g.destroy();
  return ok(res, null, "Da xoa muc tieu");
});

export const addToGoal = asyncHandler(async (req, res) => {
  const g = await FinancialGoal.findByPk(req.params.id);
  if (!g) throw notFoundError();
  if (g.userId !== req.user.id) throw forbiddenError();
  if (g.status !== "active") {
    throw badRequest("Muc tieu da hoan tat hoac da huy");
  }

  const targetAmount = Number(g.targetAmount);
  const oldProgress = targetAmount > 0 ? (Number(g.currentAmount) / targetAmount) * 100 : 0;
  const newCurrent = Number(g.currentAmount) + Number(req.body.amount);
  const newProgress = targetAmount > 0 ? (newCurrent / targetAmount) * 100 : 0;
  const data = { currentAmount: newCurrent };
  if (newCurrent >= targetAmount) {
    data.status = "completed";
  }
  await g.update(data);

  if (data.status === "completed") {
    await createNotification(req.user.id, {
      type: "goal_progress",
      severity: "info",
      title: "Muc tieu da hoan thanh",
      message: `Ban da hoan thanh muc tieu "${g.name}".`,
      relatedEntity: { entityType: "goal", entityId: g.id },
    });
  } else {
    const milestone = [75, 50, 25].find((value) => oldProgress < value && newProgress >= value);
    if (milestone) {
      await createNotification(req.user.id, {
        type: "goal_progress",
        severity: "info",
        title: "Tien do muc tieu",
        message: `Muc tieu "${g.name}" da dat ${milestone}%.`,
        relatedEntity: { entityType: "goal", entityId: g.id },
      });
    }
  }
  return ok(res, { goal: enrichGoal(g) }, "Da cap nhat tien tiet kiem");
});
