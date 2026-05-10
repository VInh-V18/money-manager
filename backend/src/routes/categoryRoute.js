import express from "express";
import * as ctrl from "../controllers/categoryController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validations/categoryValidation.js";

const router = express.Router();
router.use(protectedRoute);

router.get("/", ctrl.listCategories);
router.post("/", validate(createCategorySchema), ctrl.createCategory);
router.get("/:id", ctrl.getCategory);
router.put("/:id", validate(updateCategorySchema), ctrl.updateCategory);
router.delete("/:id", ctrl.deleteCategory);

export default router;
