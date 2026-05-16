import express from "express";
import * as ctrl from "../controllers/adminController.js";
import { protectedRoute, requireAdmin } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  updateFeedbackStatusSchema,
  updateUserRoleSchema,
} from "../validations/adminValidation.js";

const router = express.Router();
router.use(protectedRoute, requireAdmin);

router.get("/dashboard", ctrl.dashboard);
router.get("/users", ctrl.listUsers);
router.get("/user-growth", ctrl.userGrowth);
router.put("/users/:id/role", validate(updateUserRoleSchema), ctrl.updateUserRole);
router.get("/feedback", ctrl.listFeedback);
router.put("/feedback/:id/status", validate(updateFeedbackStatusSchema), ctrl.updateFeedbackStatus);
router.get("/system-logs", ctrl.listSystemLogs);

export default router;
