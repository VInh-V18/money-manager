// Gop nhieu route module nho thanh 1 file de tien quan ly
import express from "express";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";

import * as budget from "../controllers/budgetController.js";
import * as fixed from "../controllers/fixedExpenseController.js";
import * as goal from "../controllers/goalController.js";
import * as debt from "../controllers/debtController.js";
import * as tpl from "../controllers/templateController.js";
import * as notif from "../controllers/notificationController.js";

import {
  createBudgetSchema,
  updateBudgetSchema,
} from "../validations/budgetValidation.js";
import {
  createFixedExpenseSchema,
  updateFixedExpenseSchema,
} from "../validations/fixedExpenseValidation.js";
import {
  createGoalSchema,
  updateGoalSchema,
  addToGoalSchema,
  createDebtSchema,
  updateDebtSchema,
  payDebtSchema,
  createTemplateSchema,
  updateTemplateSchema,
  useTemplateSchema,
} from "../validations/otherValidations.js";

// ===== Budget =====
export const budgetRouter = express.Router();
budgetRouter.use(protectedRoute);
budgetRouter.get("/", budget.listBudgets);
budgetRouter.get("/summary", budget.getBudgetSummary);
budgetRouter.post("/", validate(createBudgetSchema), budget.createBudget);
budgetRouter.get("/:id", budget.getBudget);
budgetRouter.put("/:id", validate(updateBudgetSchema), budget.updateBudget);
budgetRouter.delete("/:id", budget.deleteBudget);

// ===== FixedExpense =====
export const fixedRouter = express.Router();
fixedRouter.use(protectedRoute);
fixedRouter.get("/", fixed.listFixedExpenses);
fixedRouter.post("/generate-due", fixed.generateDue); // chay tay
fixedRouter.post("/", validate(createFixedExpenseSchema), fixed.createFixedExpense);
fixedRouter.get("/:id", fixed.getFixedExpense);
fixedRouter.put("/:id", validate(updateFixedExpenseSchema), fixed.updateFixedExpense);
fixedRouter.delete("/:id", fixed.deleteFixedExpense);

// ===== Goal =====
export const goalRouter = express.Router();
goalRouter.use(protectedRoute);
goalRouter.get("/", goal.listGoals);
goalRouter.post("/", validate(createGoalSchema), goal.createGoal);
goalRouter.get("/:id", goal.getGoal);
goalRouter.put("/:id", validate(updateGoalSchema), goal.updateGoal);
goalRouter.delete("/:id", goal.deleteGoal);
goalRouter.post("/:id/add", validate(addToGoalSchema), goal.addToGoal);

// ===== Debt =====
export const debtRouter = express.Router();
debtRouter.use(protectedRoute);
debtRouter.get("/", debt.listDebts);
debtRouter.post("/", validate(createDebtSchema), debt.createDebt);
debtRouter.get("/:id", debt.getDebt);
debtRouter.put("/:id", validate(updateDebtSchema), debt.updateDebt);
debtRouter.delete("/:id", debt.deleteDebt);
debtRouter.post("/:id/pay", validate(payDebtSchema), debt.payDebt);

// ===== Template =====
export const templateRouter = express.Router();
templateRouter.use(protectedRoute);
templateRouter.get("/", tpl.listTemplates);
templateRouter.post("/", validate(createTemplateSchema), tpl.createTemplate);
templateRouter.get("/:id", tpl.getTemplate);
templateRouter.put("/:id", validate(updateTemplateSchema), tpl.updateTemplate);
templateRouter.delete("/:id", tpl.deleteTemplate);
templateRouter.post("/:id/use", validate(useTemplateSchema), tpl.useTemplate);

// ===== Notification =====
export const notifRouter = express.Router();
notifRouter.use(protectedRoute);
notifRouter.get("/", notif.listNotifications);
notifRouter.get("/unread-count", notif.getUnreadCount);
notifRouter.put("/mark-all-read", notif.markAllRead);
notifRouter.put("/:id/read", notif.markRead);
notifRouter.delete("/read-all", notif.deleteAllRead);
notifRouter.delete("/:id", notif.deleteNotification);
