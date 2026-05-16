import express from "express";
import * as ctrl from "../controllers/walletController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  createWalletSchema,
  updateWalletSchema,
  transferWalletSchema,
} from "../validations/walletValidation.js";

const router = express.Router();
router.use(protectedRoute);

router.get("/", ctrl.listWallets);
router.post("/", validate(createWalletSchema), ctrl.createWallet);

// chuyen tien (dat truoc /:id de tranh ham nham)
router.post("/transfer", validate(transferWalletSchema), ctrl.transferMoney);

router.get("/:id", ctrl.getWallet);
router.put("/:id", validate(updateWalletSchema), ctrl.updateWallet);
router.delete("/:id", ctrl.deleteWallet);

router.get("/:id/history", ctrl.getWalletHistory);
router.get("/:id/balance-history", ctrl.getWalletBalanceHistory);

export default router;
