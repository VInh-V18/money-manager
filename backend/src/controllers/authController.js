import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { badRequest } from "../utils/errors.js";
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
import { createOAuthCode, consumeOAuthCode } from "../utils/oauthCodeStore.js";
import env from "../config/env.js";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngay
  path: "/",
};

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

export const signUp = asyncHandler(async (req, res) => {
  await signUpService(req.body);
  return created(
    res,
    { email: req.body.email },
    "Đăng ký thành công. Bạn có thể đăng nhập ngay."
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
  return ok(res, { user, accessToken }, "Đăng nhập thành công");
});

const getOAuthRedirectUri = (req, provider) =>
  `${trimTrailingSlash(env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`)}/api/auth/oauth/${provider}/callback`;

const redirectOAuthError = (res, message) => {
  const params = new URLSearchParams({ error: message });
  return res.redirect(`${trimTrailingSlash(env.CLIENT_URL)}/oauth/callback?${params.toString()}`);
};

export const oauthStart = asyncHandler(async (req, res) => {
  const provider = req.params.provider;
  // Include `from` in state so it survives the full OAuth redirect cycle
  const from = typeof req.query.from === "string" ? req.query.from.slice(0, 200) : "/";
  const state = Buffer.from(
    JSON.stringify({ provider, ts: Date.now(), from })
  ).toString("base64url");

  let url;
  try {
    url = getOAuthStartUrl({
      provider,
      redirectUri: getOAuthRedirectUri(req, provider),
      state,
    });
  } catch (error) {
    return redirectOAuthError(res, error?.message || "OAuth chua duoc cau hinh");
  }

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
    return redirectOAuthError(res, "Không nhận được mã xác thực OAuth");
  }

  // Extract `from` from state so we can pass it through to the frontend
  let from = "/";
  try {
    const stateRaw = Buffer.from(String(req.query.state || ""), "base64url").toString();
    const stateData = JSON.parse(stateRaw);
    if (typeof stateData.from === "string") from = stateData.from;
  } catch {
    // Ignore malformed state — just use "/"
  }

  try {
    const { accessToken, refreshToken } = await signInWithOAuthService({
      provider,
      code: String(req.query.code),
      redirectUri: getOAuthRedirectUri(req, provider),
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    // Store tokens server-side, redirect with a short-lived opaque code.
    // This keeps the access token out of the browser URL (OWASP A07).
    const oauthCode = await createOAuthCode({ accessToken, refreshToken });
    const params = new URLSearchParams({ code: oauthCode });
    if (from && from !== "/") params.set("from", from);
    return res.redirect(`${trimTrailingSlash(env.CLIENT_URL)}/oauth/callback?${params.toString()}`);
  } catch (error) {
    return redirectOAuthError(
      res,
      error?.message || "Đăng nhập bằng OAuth không thành công"
    );
  }
});

/**
 * Đổi OAuth one-time code lấy access token + set refresh token cookie.
 * Code chỉ dùng được 1 lần, hết hạn sau 60 giây.
 */
export const exchangeOAuthCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw badRequest("Thiếu code");

  const tokens = await consumeOAuthCode(code);
  if (!tokens) {
    return res.status(400).json({ success: false, message: "Code không hợp lệ hoặc đã hết hạn" });
  }

  res.cookie("refreshToken", tokens.refreshToken, COOKIE_OPTS);
  return ok(res, { accessToken: tokens.accessToken }, "Đăng nhập OAuth thành công");
});

export const signOut = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  await signOutService(token);
  res.clearCookie("refreshToken", { path: "/" });
  return ok(res, null, "Đăng xuất thành công");
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Không có refresh token" });
  }
  const { accessToken } = await refreshTokenService(token);
  return ok(res, { accessToken });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await verifyOtpService({ ...req.body, purpose: "verify_email" });
  return ok(res, null, "Xác thực email thành công");
});

export const resendVerifyOtp = asyncHandler(async (req, res) => {
  await resendOtpService({ email: req.body.email, purpose: "verify_email" });
  return ok(res, null, "Đã gửi lại OTP");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = await forgotPasswordService(req.body);
  return ok(
    res,
    data,
    "Nếu email tồn tại, OTP đã được gửi. Vui lòng kiểm tra hộp thư."
  );
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { resetToken } = await verifyOtpService({
    ...req.body,
    purpose: "reset_password",
  });
  return ok(res, { resetToken }, "OTP hợp lệ. Hãy đặt lại mật khẩu.");
});

export const resetPassword = asyncHandler(async (req, res) => {
  await resetPasswordService(req.body);
  return ok(res, null, "Đặt lại mật khẩu thành công. Hãy đăng nhập lại.");
});

// ===== Profile (private) =====
export const me = asyncHandler(async (req, res) => {
  return ok(res, { user: req.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  // Explicit field whitelist — never trust req.body shape even after Zod validation
  const { displayName, bio, phone, defaultCurrency, timezone } = req.body;
  await req.user.update({ displayName, bio, phone, defaultCurrency, timezone });
  const safe = req.user.toJSON();
  delete safe.hashedPassword;
  return ok(res, { user: safe }, "Cập nhật hồ sơ thành công");
});

export const changePassword = asyncHandler(async (req, res) => {
  const { writeActivityLog } = await import("../services/activityLogService.js");
  await changePasswordService(req.user.id, req.body);
  await writeActivityLog({
    userId: req.user.id,
    action: "change_password",
    entityType: "user",
    entityId: req.user.id,
    payload: { allSessionsRevoked: true },
    ipAddress: req.ip,
  });
  return ok(res, null, "Đổi mật khẩu thành công. Hãy đăng nhập lại.");
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Không có file upload" });
  }
  const url = `/uploads/${req.file.filename}`;
  await req.user.update({ avatarUrl: url, avatarId: req.file.filename });
  return ok(res, { avatarUrl: url }, "Cập nhật avatar thành công");
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
  return ok(res, { revokedCurrent }, "Đã đăng xuất phiên");
});

export const revokeOtherSessions = asyncHandler(async (req, res) => {
  const { writeActivityLog } = await import("../services/activityLogService.js");
  const data = await revokeOtherSessionsService(req.user.id, req.cookies?.refreshToken);
  await writeActivityLog({
    userId: req.user.id,
    action: "revoke_other_sessions",
    entityType: "user",
    entityId: req.user.id,
    payload: { revokedCount: data.revokedCount },
    ipAddress: req.ip,
  });
  return ok(res, data, "Đã đăng xuất các thiết bị khác");
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
  return ok(res, data, "Quét QR code bằng Google Authenticator rồi xác nhận bằng /2fa/enable");
});

export const enable2FAHandler = asyncHandler(async (req, res) => {
  const { writeActivityLog } = await import("../services/activityLogService.js");
  const { token } = req.body;
  const data = await enable2FA(req.user.id, token);
  await writeActivityLog({
    userId: req.user.id,
    action: "enable_2fa",
    entityType: "user",
    entityId: req.user.id,
    payload: {},
    ipAddress: req.ip,
  });
  return ok(
    res,
    data,
    "Bật 2FA thành công. Hãy lưu backup codes để phòng trường hợp mất điện thoại"
  );
});

export const disable2FAHandler = asyncHandler(async (req, res) => {
  const { writeActivityLog } = await import("../services/activityLogService.js");
  const { password } = req.body;
  const data = await disable2FA(req.user.id, password);
  await writeActivityLog({
    userId: req.user.id,
    action: "disable_2fa",
    entityType: "user",
    entityId: req.user.id,
    payload: {},
    ipAddress: req.ip,
  });
  return ok(res, data, "Đã tắt 2FA");
});

export const regenerateBackupCodesHandler = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const data = await regenerateBackupCodes(req.user.id, password);
  return ok(res, data, "Tạo lại backup codes thành công. Backup codes cũ đã bị huỷ");
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
  return ok(res, { user, accessToken }, "Đăng nhập 2FA thành công");
});
