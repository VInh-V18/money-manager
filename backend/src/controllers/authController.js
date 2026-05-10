import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import {
  signUpService,
  signInService,
  signOutService,
  refreshTokenService,
  verifyOtpService,
  resendOtpService,
  forgotPasswordService,
  resetPasswordService,
  changePasswordService,
} from "../services/authService.js";
import { User } from "../models/index.js";
import { hashPassword } from "../utils/bcrypt.js";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngay
  path: "/",
};

export const signUp = asyncHandler(async (req, res) => {
  await signUpService(req.body);
  return created(
    res,
    { email: req.body.email },
    "Dang ky thanh cong. Vui long kiem tra email de nhap OTP xac thuc."
  );
});

export const signIn = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await signInService({
    identifier: req.body.identifier,
    password: req.body.password,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
  return ok(res, { user, accessToken }, "Dang nhap thanh cong");
});

export const signOut = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  await signOutService(token);
  res.clearCookie("refreshToken", { path: "/" });
  return ok(res, null, "Dang xuat thanh cong");
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Khong co refresh token" });
  }
  const { accessToken } = await refreshTokenService(token);
  return ok(res, { accessToken });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await verifyOtpService({ ...req.body, purpose: "verify_email" });
  return ok(res, null, "Xac thuc email thanh cong");
});

export const resendVerifyOtp = asyncHandler(async (req, res) => {
  await resendOtpService({ email: req.body.email, purpose: "verify_email" });
  return ok(res, null, "Da gui lai OTP");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await forgotPasswordService(req.body);
  return ok(
    res,
    null,
    "Neu email ton tai, OTP da duoc gui. Vui long kiem tra hop thu."
  );
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { resetToken } = await verifyOtpService({
    ...req.body,
    purpose: "reset_password",
  });
  return ok(res, { resetToken }, "OTP hop le. Hay dat lai mat khau.");
});

export const resetPassword = asyncHandler(async (req, res) => {
  await resetPasswordService(req.body);
  return ok(res, null, "Dat lai mat khau thanh cong. Hay dang nhap lai.");
});

// ===== Profile (private) =====
export const me = asyncHandler(async (req, res) => {
  return ok(res, { user: req.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  await req.user.update(req.body);
  const safe = req.user.toJSON();
  delete safe.hashedPassword;
  return ok(res, { user: safe }, "Cap nhat ho so thanh cong");
});

export const changePassword = asyncHandler(async (req, res) => {
  await changePasswordService(req.user.id, req.body);
  return ok(res, null, "Doi mat khau thanh cong. Hay dang nhap lai.");
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Khong co file upload" });
  }
  const url = `/uploads/${req.file.filename}`;
  await req.user.update({ avatarUrl: url, avatarId: req.file.filename });
  return ok(res, { avatarUrl: url }, "Cap nhat avatar thanh cong");
});
