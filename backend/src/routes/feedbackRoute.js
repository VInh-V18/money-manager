import express from "express";
import * as ctrl from "../controllers/feedbackController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  createFeedbackSchema,
  listFeedbackQuerySchema,
} from "../validations/feedbackValidation.js";

const router = express.Router();
router.use(protectedRoute);

router.get("/", validate(listFeedbackQuerySchema, "query"), ctrl.listFeedback);
router.post("/", validate(createFeedbackSchema), ctrl.createFeedback);

export default router;
