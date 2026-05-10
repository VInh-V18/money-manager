import express from "express";
import * as ctrl from "../controllers/transactionController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionQuerySchema,
  createDailyWageSchema,
  createHourlyWageSchema,
} from "../validations/transactionValidation.js";

const router = express.Router();
router.use(protectedRoute);

// route co tham so cu the dat truoc /:id
router.get("/recent", ctrl.getRecentTransactions);
router.get("/search", ctrl.searchTransactions);

router.get("/", validate(listTransactionQuerySchema, "query"), ctrl.listTransactions);
router.post("/", validate(createTransactionSchema), ctrl.createTransaction);

// helper api thu nhap theo ngay/gio
router.post(
  "/daily-wage",
  validate(createDailyWageSchema),
  ctrl.createDailyWage
);
router.post(
  "/hourly-wage",
  validate(createHourlyWageSchema),
  ctrl.createHourlyWage
);

router.get("/:id", ctrl.getTransaction);
router.put("/:id", validate(updateTransactionSchema), ctrl.updateTransaction);
router.delete("/:id", ctrl.deleteTransaction);

export default router;
