import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import {
  signUpService,
  signInService,
  signInWith2FAService,
  getOAuthStartUrl,
  signInWithOAuthService,
  signOutService,
  refreshTokenService,
  verifyOtpService,
  resendOtpService,
  forgotPasswordService,
  resetPasswordService,
  changePasswordService,
  listSessionsService,
  revokeSessionService,
  revokeOtherSessionsService,
  listLoginHistoryService,
  listActivityLogsService,
} from "../services/authService.js";
import {
  generate2FASecret,
  enable2FA,
  disable2FA,
  regenerateBackupCodes,
} from "../services/twoFactorService.js";
import env from "../config/env.js";

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
    "Dang ky thanh cong. Ban co the dang nhap ngay."
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

const getOAuthRedirectUri = (req, provider) =>
  `${env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`}/api/auth/oauth/${provider}/callback`;

const redirectOAuthError = (res, message) => {
  const params = new URLSearchParams({ error: message });
  return res.redirect(`${env.CLIENT_URL}/oauth/callback?${params.toString()}`);
};

export const oauthStart = asyncHandler(async (req, res) => {
  const provider = req.params.provider;
  const state = Buffer.from(
    JSON.stringify({ provider, ts: Date.now() })
  ).toString("base64url");

  const url = getOAuthStartUrl({
    provider,
    redirectUri: getOAuthRedirectUri(req, provider),
    state,
  });

  return res.redirect(url);
});

export const oauthCallback = asyncHandler(async (req, res) => {
  const provider = req.params.provider;

  if (req.query.error) {
    return redirectOAuthError(
      res,
      String(req.query.error_description || req.query.error)
    );
  }

  if (!req.query.code) {
    return redirectOAuthError(res, "Khong nhan duoc ma xac thuc OAuth");
  }

  try {
    const { accessToken, refreshToken } = await signInWithOAuthService({
      provider,
      code: String(req.query.code),
      redirectUri: getOAuthRedirectUri(req, provider),
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
    const params = new URLSearchParams({ accessToken });
    return res.redirect(`${env.CLIENT_URL}/oauth/callback?${params.toString()}`);
  } catch (error) {
    return redirectOAuthError(
      res,
      error?.message || "Dang nhap bang OAuth khong thanh cong"
    );
  }
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
  const data = await forgotPasswordService(req.body);
  return ok(
    res,
    data,
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

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await listSessionsService(req.user.id, req.cookies?.refreshToken);
  return ok(res, { items: sessions });
});

export const revokeSession = asyncHandler(async (req, res) => {
  const { revokedCurrent } = await revokeSessionService(
    req.user.id,
    Number(req.params.id),
    req.cookies?.refreshToken
  );
  if (revokedCurrent) {
    res.clearCookie("refreshToken", { path: "/" });
  }
  return ok(res, { revokedCurrent }, "Da dang xuat phien");
});

export const revokeOtherSessions = asyncHandler(async (req, res) => {
  const data = await revokeOtherSessionsService(req.user.id, req.cookies?.refreshToken);
  return ok(res, data, "Da dang xuat cac thiet bi khac");
});

export const loginHistory = asyncHandler(async (req, res) => {
  const data = await listLoginHistoryService(req.user.id, req.query);
  return ok(res, data);
});

export const activityLogs = asyncHandler(async (req, res) => {
  const data = await listActivityLogsService(req.user.id, req.query);
  return ok(res, data);
});

// ===== 2FA (Two-Factor Authentication) =====

export const setup2FA = asyncHandler(async (req, res) => {
  const data = await generate2FASecret(req.user.id);
  return ok(res, data, "Quet QR code bang Google Authenticator roi xac nhan bang /2fa/enable");
});

export const enable2FAHandler = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const data = await enable2FA(req.user.id, token);
  return ok(
    res,
    data,
    "Bat 2FA thanh cong. Hay luu backup codes de phong truong hop mat dien thoai"
  );
});

export const disable2FAHandler = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const data = await disable2FA(req.user.id, password);
  return ok(res, data, "Da tat 2FA");
});

export const regenerateBackupCodesHandler = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const data = await regenerateBackupCodes(req.user.id, password);
  return ok(res, data, "Tao lai backup codes thanh cong. Backup codes cu da bi huy");
});

export const signInWith2FA = asyncHandler(async (req, res) => {
  const { twoFactorToken, token, useBackup } = req.body;
  const { user, accessToken, refreshToken } = await signInWith2FAService({
    twoFactorToken,
    token,
    useBackup: Boolean(useBackup),
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });
  res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
  return ok(res, { user, accessToken }, "Dang nhap 2FA thanh cong");
});
