import express from "express";
import rateLimit from "express-rate-limit";
import * as ctrl from "../controllers/aiController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { aiChatSchema, aiTextSchema } from "../validations/aiValidation.js";

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "AI đang nhận quá nhiều yêu cầu, vui lòng thử lại sau" },
});

router.use(protectedRoute);

router.get("/context", ctrl.context);
router.post("/chat", aiLimiter, validate(aiChatSchema), ctrl.chat);
router.post("/classify", validate(aiTextSchema), ctrl.classify);
router.post("/natural-transaction", aiLimiter, validate(aiTextSchema), ctrl.naturalTransaction);
router.get("/spending-total", ctrl.spendingTotal);
router.get("/monthly-analysis", aiLimiter, ctrl.monthlyAnalysis);
router.get("/savings", aiLimiter, ctrl.savings);
router.get("/report", aiLimiter, ctrl.report);
router.get("/weekly-digest", aiLimiter, ctrl.weekly);
router.get("/anomaly", aiLimiter, ctrl.anomaly);

// ===== Chat Sessions =====
router.get("/sessions", ctrl.listSessions);
router.get("/sessions/:id", ctrl.getSession);
router.delete("/sessions/:id", ctrl.deleteSession);

export default router;
