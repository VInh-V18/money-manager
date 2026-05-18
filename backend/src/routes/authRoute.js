import express from "express";
import rateLimit from "express-rate-limit";
import * as ctrl from "../controllers/authController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { uploadImage } from "../middlewares/uploadMiddleware.js";
import {
  signUpSchema,
  signInSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../validations/authValidation.js";

const router = express.Router();

// rate limit cho cac route nhay cam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Qua nhieu lan thu, hay cho 15 phut" },
});

// ===== Public =====
router.post("/signup", authLimiter, validate(signUpSchema), ctrl.signUp);
router.post("/signin", authLimiter, validate(signInSchema), ctrl.signIn);
router.get("/oauth/:provider", authLimiter, ctrl.oauthStart);
router.get("/oauth/:provider/callback", authLimiter, ctrl.oauthCallback);
// Exchange one-time OAuth code for tokens (keeps access token out of URL)
router.post("/oauth/exchange", authLimiter, ctrl.exchangeOAuthCode);
router.post("/signout", ctrl.signOut);
router.post("/refresh", ctrl.refreshToken);

router.post(
  "/verify-email",
  authLimiter,
  validate(verifyOtpSchema.omit({ purpose: true })),
  ctrl.verifyEmail
);
router.post(
  "/resend-verify-otp",
  authLimiter,
  validate(resendOtpSchema.omit({ purpose: true })),
  ctrl.resendVerifyOtp
);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  ctrl.forgotPassword
);
router.post(
  "/verify-reset-otp",
  authLimiter,
  validate(verifyOtpSchema.omit({ purpose: true })),
  ctrl.verifyResetOtp
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  ctrl.resetPassword
);

// ===== Private =====
router.use(protectedRoute);

router.get("/me", ctrl.me);
router.put("/profile", validate(updateProfileSchema), ctrl.updateProfile);
router.put(
  "/change-password",
  validate(changePasswordSchema),
  ctrl.changePassword
);
router.post("/avatar", uploadImage.single("avatar"), ctrl.uploadAvatar);
router.get("/sessions", ctrl.listSessions);
router.delete("/sessions/others", ctrl.revokeOtherSessions);
router.delete("/sessions/:id", ctrl.revokeSession);
router.get("/login-history", ctrl.loginHistory);
router.get("/activity-logs", ctrl.activityLogs);

// ===== 2FA routes (protected) =====
router.get("/2fa/setup", ctrl.setup2FA);
router.post("/2fa/enable", ctrl.enable2FAHandler);
router.post("/2fa/disable", ctrl.disable2FAHandler);
router.post("/2fa/backup-codes/regenerate", ctrl.regenerateBackupCodesHandler);

// ===== 2FA signin (public - buoc 2 sau khi password hop le) =====
router.post("/2fa/verify", authLimiter, ctrl.signInWith2FA);

export default router;
