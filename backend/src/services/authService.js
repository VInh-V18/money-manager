/**
 * Service auth: tach logic phuc tap khoi controller
 */
import crypto from "crypto";
import { Op } from "sequelize";
import {
  User,
  Otp,
  RefreshToken,
  LoginHistory,
  ActivityLog,
  Category,
  sequelize,
} from "../models/index.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import {
  signAccessToken,
  signRefreshToken,
  sign2FAChallengeToken,
  verify2FAChallengeToken,
} from "../utils/jwt.js";
import { verify2FAToken, useBackupCode } from "./twoFactorService.js";
import { sendOtpEmail } from "./mailService.js";
import env from "../config/env.js";
import {
  badRequest,
  unauthorizedError,
  notFoundError,
  conflictError,
} from "../utils/errors.js";
import { addDays } from "../utils/date.js";

const OTP_TTL_MINUTES = 10;
const RESET_TOKEN_TTL_MINUTES = 15;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const DEFAULT_INCOME_CATS = [
  { name: "Lương", icon: "briefcase", color: "#10B981" },
  { name: "Thưởng", icon: "gift", color: "#10B981" },
  { name: "Làm thêm", icon: "clock", color: "#10B981" },
  { name: "Freelance", icon: "laptop", color: "#10B981" },
  { name: "Bán hàng", icon: "shopping-bag", color: "#10B981" },
  { name: "Được cho", icon: "heart", color: "#10B981" },
  { name: "Hoàn tiền", icon: "rotate-ccw", color: "#10B981" },
  { name: "Khác", icon: "more-horizontal", color: "#10B981" },
];

const DEFAULT_EXPENSE_CATS = [
  { name: "Ăn uống", icon: "utensils", color: "#EF4444" },
  { name: "Đi lại", icon: "car", color: "#F97316" },
  { name: "Nhà ở", icon: "home", color: "#A855F7" },
  { name: "Học tập", icon: "book", color: "#3B82F6" },
  { name: "Giải trí", icon: "music", color: "#EC4899" },
  { name: "Mua sắm", icon: "shopping-cart", color: "#F59E0B" },
  { name: "Sức khỏe", icon: "heart-pulse", color: "#14B8A6" },
  { name: "Gia đình", icon: "users", color: "#8B5CF6" },
  { name: "Trả nợ", icon: "credit-card", color: "#DC2626" },
  { name: "Khác", icon: "more-horizontal", color: "#6B7280" },
];

const generateOtp = () =>
  String(crypto.randomInt(100000, 1000000)).padStart(6, "0");

const generateResetToken = () =>
  crypto.randomBytes(32).toString("hex");

const createDefaultCategories = (userId) => [
  ...DEFAULT_INCOME_CATS.map((c, i) => ({
    ...c,
    userId,
    type: "income",
    isSystem: true,
    sortOrder: i,
  })),
  ...DEFAULT_EXPENSE_CATS.map((c, i) => ({
    ...c,
    userId,
    type: "expense",
    isSystem: true,
    sortOrder: i,
  })),
];

const assertStrongPassword = (password, { email, username } = {}) => {
  const value = String(password || "");
  const normalized = value.toLowerCase();
  const weakPasswords = new Set([
    "password",
    "password123",
    "12345678",
    "123456789",
    "qwerty123",
    "admin123",
    "demo1234",
  ]);

  if (value.length < 8) {
    throw badRequest("Mật khẩu phải có tối thiểu 8 ký tự");
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    throw badRequest("Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt");
  }
  if (weakPasswords.has(normalized)) {
    throw badRequest("Mật khẩu quá yếu, vui lòng chọn mật khẩu khó đoán hơn");
  }
  const emailName = email ? String(email).split("@")[0].toLowerCase() : "";
  const usernameValue = username ? String(username).toLowerCase() : "";
  if ((emailName && normalized.includes(emailName)) || (usernameValue && normalized.includes(usernameValue))) {
    throw badRequest("Mật khẩu không được chứa email hoặc username");
  }
};

const safeUserJson = (user) => {
  const safeUser = user.toJSON();
  delete safeUser.hashedPassword;
  return safeUser;
};

const getClientInfo = (userAgent = "") => {
  const ua = String(userAgent || "");
  const browser =
    ua.includes("Edg/")
      ? "Microsoft Edge"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Firefox/")
          ? "Firefox"
          : ua.includes("Safari/")
            ? "Safari"
            : "Unknown";
  const os =
    ua.includes("Windows")
      ? "Windows"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : ua.includes("Mac OS")
            ? "macOS"
            : ua.includes("Linux")
              ? "Linux"
              : "Unknown";
  const deviceName = ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")
    ? "Mobile"
    : "Desktop";
  return { browser, os, deviceName };
};

const recordLoginHistory = async ({
  userId,
  email,
  status,
  reason,
  userAgent,
  ipAddress,
}) => {
  const clientInfo = getClientInfo(userAgent);
  await LoginHistory.create({
    userId,
    email,
    status,
    reason,
    userAgent: userAgent?.slice(0, 500),
    ipAddress,
    ...clientInfo,
  }).catch(() => {});
};

const issueSession = async (user, { userAgent, ipAddress } = {}) => {
  const accessToken = signAccessToken({ id: user.id });
  const refreshToken = signRefreshToken({ id: user.id });
  const clientInfo = getClientInfo(userAgent);

  await RefreshToken.create({
    userId: user.id,
    token: refreshToken,
    userAgent: userAgent?.slice(0, 500),
    ipAddress,
    ...clientInfo,
    lastActiveAt: new Date(),
    expiresAt: addDays(new Date(), 7),
  });

  return { user: safeUserJson(user), accessToken, refreshToken };
};

/**
 * Dang ky:
 *   - Tao user da verify
 *   - Tao 18 danh muc mac dinh (10 chi + 8 thu) -> de user dung ngay
 */
export const signUpService = async ({ username, email, password, displayName }) => {
  assertStrongPassword(password, { email, username });

  // check trung username/email
  const existing = await User.findOne({
    where: { [Op.or]: [{ email }, { username }] },
  });
  if (existing) {
    throw conflictError(
      existing.email === email
        ? "Email đã được đăng ký"
        : "Username đã được sử dụng"
    );
  }

  // tao trong transaction de neu loi giua chung -> rollback
  return sequelize.transaction(async (dbTx) => {
    const user = await User.create(
      {
        username,
        email,
        hashedPassword: await hashPassword(password),
        displayName,
        isVerified: true,
        passwordChangedAt: new Date(),
      },
      { transaction: dbTx }
    );

    // tao danh muc mac dinh cho user moi
    await Category.bulkCreate(createDefaultCategories(user.id), { transaction: dbTx });

    return user;
  });
};

/**
 * Xac thuc OTP cho purpose verify_email/reset_password
 *   - verify_email -> set user.isVerified = true
 *   - reset_password -> tra ve resetToken (15 phut)
 */
export const verifyOtpService = async ({ email, code, purpose }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw notFoundError("Email không tồn tại");

  const otp = await Otp.findOne({
    where: {
      userId: user.id,
      purpose,
      code,
      used: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });
  if (!otp) throw badRequest("OTP không đúng hoặc đã hết hạn");

  await otp.update({ used: true });

  if (purpose === "verify_email") {
    await user.update({ isVerified: true });
    return { verified: true };
  }

  // reset_password -> sinh resetToken luu vao Otp moi (re-use bang)
  const resetToken = generateResetToken();
  await Otp.create({
    userId: user.id,
    purpose: "reset_password",
    code: resetToken, // luu trong field code, danh dau bang prefix?
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    used: false,
  });
  return { resetToken };
};

export const resendOtpService = async ({ email, purpose }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw notFoundError("Email không tồn tại");

  // huy OTP cu cung purpose chua dung
  await Otp.update(
    { used: true },
    { where: { userId: user.id, purpose, used: false } }
  );

  const code = generateOtp();
  await Otp.create({
    userId: user.id,
    purpose,
    code,
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  await sendOtpEmail({
    to: email,
    code,
    purpose,
    displayName: user.displayName,
  });

  return { sent: true };
};

export const forgotPasswordService = async ({ email }) => {
  const user = await User.findOne({ where: { email } });
  // KHONG ne user co ton tai hay khong de tranh enumerate
  if (!user) return { sent: true };
  return resendOtpService({ email, purpose: "reset_password" });
};

export const resetPasswordService = async ({ email, resetToken, newPassword }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw notFoundError("Email không tồn tại");
  assertStrongPassword(newPassword, { email: user.email, username: user.username });

  const reused = await comparePassword(newPassword, user.hashedPassword);
  if (reused) throw badRequest("Mật khẩu mới không được trùng mật khẩu cũ");

  const tokenRow = await Otp.findOne({
    where: {
      userId: user.id,
      purpose: "reset_password",
      code: resetToken,
      used: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });
  if (!tokenRow) throw badRequest("Reset token không hợp lệ hoặc đã hết hạn");

  await sequelize.transaction(async (dbTx) => {
    await user.update(
      {
        hashedPassword: await hashPassword(newPassword),
        failedLoginCount: 0,
        lockedUntil: null,
        passwordChangedAt: new Date(),
      },
      { transaction: dbTx }
    );
    await tokenRow.update({ used: true }, { transaction: dbTx });
    // logout het thiet bi cu
    await RefreshToken.update(
      { revoked: true, revokedAt: new Date() },
      { where: { userId: user.id, revoked: false }, transaction: dbTx }
    );
  });
  return { reset: true };
};

/**
 * Dang nhap (bang email hoac username)
 */
export const signInService = async ({ identifier, password, userAgent, ipAddress }) => {
  const user = await User.findOne({
    where: {
      [Op.or]: [{ email: identifier }, { username: identifier }],
    },
  });
  if (!user) {
    await recordLoginHistory({
      email: identifier,
      status: "FAILED_USER",
      reason: "User not found",
      userAgent,
      ipAddress,
    });
    throw unauthorizedError("Sai thông tin đăng nhập");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await recordLoginHistory({
      userId: user.id,
      email: user.email,
      status: "LOCKED",
      reason: "Account temporarily locked",
      userAgent,
      ipAddress,
    });
    throw unauthorizedError("Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau");
  }

  const ok = await comparePassword(password, user.hashedPassword);
  if (!ok) {
    const failedLoginCount = Number(user.failedLoginCount || 0) + 1;
    const shouldLock = failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS;
    await user.update({
      failedLoginCount,
      lockedUntil: shouldLock
        ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
        : user.lockedUntil,
    });
    await recordLoginHistory({
      userId: user.id,
      email: user.email,
      status: shouldLock ? "LOCKED" : "FAILED_PASSWORD",
      reason: shouldLock ? "Too many failed password attempts" : "Wrong password",
      userAgent,
      ipAddress,
    });
    throw unauthorizedError(
      shouldLock
        ? `Sai mật khẩu quá ${MAX_FAILED_LOGIN_ATTEMPTS} lần. Tài khoản bị khóa ${LOCK_MINUTES} phút`
        : "Sai thông tin đăng nhập"
    );
  }

  if (user.failedLoginCount || user.lockedUntil) {
    await user.update({ failedLoginCount: 0, lockedUntil: null });
  }

  // Neu 2FA duoc bat, tra challenge token thay vi tao phien ngay
  if (user.twoFactorEnabled) {
    const twoFactorToken = sign2FAChallengeToken(user.id);
    return { requires2FA: true, twoFactorToken };
  }

  const session = await issueSession(user, { userAgent, ipAddress });
  await recordLoginHistory({
    userId: user.id,
    email: user.email,
    status: "SUCCESS",
    userAgent,
    ipAddress,
  });
  return session;
};

/**
 * Buoc 2 dang nhap khi 2FA duoc bat
 * token: ma TOTP 6 chu so, hoac backup code
 * twoFactorToken: challenge JWT tu buoc 1
 */
export const signInWith2FAService = async ({
  twoFactorToken,
  token,
  useBackup = false,
  userAgent,
  ipAddress,
}) => {
  let payload;
  try {
    payload = verify2FAChallengeToken(twoFactorToken);
  } catch {
    throw unauthorizedError("2FA challenge token không hợp lệ hoặc đã hết hạn");
  }

  const userId = payload.id;

  if (useBackup) {
    await useBackupCode(userId, token);
  } else {
    await verify2FAToken(userId, token);
  }

  const user = await User.findByPk(userId);
  const session = await issueSession(user, { userAgent, ipAddress });
  await recordLoginHistory({
    userId: user.id,
    email: user.email,
    status: "SUCCESS",
    userAgent,
    ipAddress,
  });
  return session;
};

const oauthProviders = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    clientId: () => env.GOOGLE_CLIENT_ID,
    clientSecret: () => env.GOOGLE_CLIENT_SECRET,
    scope: "openid email profile",
    mapProfile: (profile) => ({
      providerUserId: profile.sub,
      email: profile.email,
      displayName: profile.name || profile.email,
      avatarUrl: profile.picture || null,
    }),
  },
  facebook: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)",
    clientId: () => env.FACEBOOK_CLIENT_ID,
    clientSecret: () => env.FACEBOOK_CLIENT_SECRET,
    scope: "email,public_profile",
    mapProfile: (profile) => ({
      providerUserId: profile.id,
      email: profile.email,
      displayName: profile.name || profile.email,
      avatarUrl: profile.picture?.data?.url || null,
    }),
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    profileUrl: "https://api.github.com/user",
    emailUrl: "https://api.github.com/user/emails",
    clientId: () => env.GITHUB_CLIENT_ID,
    clientSecret: () => env.GITHUB_CLIENT_SECRET,
    scope: "read:user user:email",
    mapProfile: (profile, email) => ({
      providerUserId: profile.id,
      email,
      displayName: profile.name || profile.login || email,
      avatarUrl: profile.avatar_url || null,
    }),
  },
};

const getOAuthProvider = (provider) => {
  const config = oauthProviders[provider];
  if (!config) throw badRequest("Nhà cung cấp OAuth không hợp lệ");
  if (!config.clientId() || !config.clientSecret()) {
    throw badRequest(`Chưa cấu hình OAuth ${provider}`);
  }
  return config;
};

export const getOAuthStartUrl = ({ provider, redirectUri, state }) => {
  const config = getOAuthProvider(provider);
  const params = new URLSearchParams({
    client_id: config.clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
  });
  if (provider === "google") {
    params.set("access_type", "offline");
    params.set("prompt", "select_account");
  }
  return `${config.authUrl}?${params.toString()}`;
};

const exchangeOAuthCode = async ({ provider, code, redirectUri }) => {
  const config = getOAuthProvider(provider);
  const params = new URLSearchParams({
    client_id: config.clientId(),
    client_secret: config.clientSecret(),
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const reason = data.error_description || data.error_message || (data.error?.message) || data.error || "Không lấy được OAuth access token";
    throw unauthorizedError(`[${provider}] ${reason} (redirect_uri: ${redirectUri})`);
  }
  return data.access_token;
};

const fetchOAuthProfile = async (provider, accessToken) => {
  const config = getOAuthProvider(provider);
  const profileRes = await fetch(config.profileUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "money-manager",
    },
  });
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok) throw unauthorizedError("Không lấy được thông tin OAuth user");

  if (provider !== "github") return config.mapProfile(profile);

  const emailRes = await fetch(config.emailUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "money-manager",
    },
  });
  const emails = await emailRes.json().catch(() => []);
  const primary = Array.isArray(emails)
    ? emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified)
    : null;
  return config.mapProfile(profile, primary?.email || profile.email);
};

const buildOAuthEmail = (provider, profile) => {
  if (profile.email) return profile.email;
  if (!profile.providerUserId) return null;
  return `${provider}_${profile.providerUserId}@oauth.local`;
};

const makeOAuthUsername = async (email) => {
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40) || "oauth_user";
  let username = base;
  let index = 0;
  while (await User.findOne({ where: { username } })) {
    index += 1;
    username = `${base}_${index}`;
  }
  return username;
};

export const signInWithOAuthService = async ({
  provider,
  code,
  redirectUri,
  userAgent,
  ipAddress,
}) => {
  const oauthToken = await exchangeOAuthCode({ provider, code, redirectUri });
  const profile = await fetchOAuthProfile(provider, oauthToken);
  const email = buildOAuthEmail(provider, profile);
  if (!email) throw unauthorizedError("Tai khoan OAuth khong co email");

  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await sequelize.transaction(async (dbTx) => {
      const createdUser = await User.create(
        {
          username: await makeOAuthUsername(email),
          email,
          hashedPassword: await hashPassword(crypto.randomBytes(32).toString("hex")),
          displayName: profile.displayName || email,
          avatarUrl: profile.avatarUrl,
          isVerified: true,
          passwordChangedAt: new Date(),
        },
        { transaction: dbTx }
      );
      await Category.bulkCreate(createDefaultCategories(createdUser.id), { transaction: dbTx });
      return createdUser;
    });
  } else {
    await user.update({
      isVerified: true,
      displayName: user.displayName || profile.displayName,
      avatarUrl: user.avatarUrl || profile.avatarUrl,
    });
  }

  const session = await issueSession(user, { userAgent, ipAddress });
  await recordLoginHistory({
    userId: user.id,
    email: user.email,
    status: "OAUTH_SUCCESS",
    userAgent,
    ipAddress,
  });
  return session;
};

export const refreshTokenService = async (oldToken) => {
  const row = await RefreshToken.findOne({
    where: { token: oldToken, revoked: false },
  });
  if (!row) throw unauthorizedError("Refresh token không hợp lệ");
  if (row.expiresAt < new Date()) {
    throw unauthorizedError("Refresh token hết hạn");
  }

  // verify chữ ký
  const { verifyRefreshToken } = await import("../utils/jwt.js");
  let payload;
  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    throw unauthorizedError("Refresh token sai chữ ký");
  }
  if (payload.id !== row.userId) {
    throw unauthorizedError("Refresh token không khớp");
  }

  const user = await User.findByPk(row.userId);
  if (!user) throw unauthorizedError("User không tồn tại");

  await row.update({ lastActiveAt: new Date() });
  const accessToken = signAccessToken({ id: user.id });
  return { accessToken };
};

export const signOutService = async (refreshToken) => {
  if (!refreshToken) return;
  await RefreshToken.update(
    { revoked: true, revokedAt: new Date() },
    { where: { token: refreshToken } }
  );
};

export const listSessionsService = async (userId, currentRefreshToken) => {
  const rows = await RefreshToken.findAll({
    where: {
      userId,
      revoked: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["lastActiveAt", "DESC"], ["createdAt", "DESC"]],
  });

  return rows.map((row) => ({
    id: row.id,
    deviceName: row.deviceName,
    browser: row.browser,
    os: row.os,
    ipAddress: row.ipAddress,
    lastActiveAt: row.lastActiveAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    isCurrent: currentRefreshToken ? row.token === currentRefreshToken : false,
  }));
};

export const revokeSessionService = async (userId, sessionId, currentRefreshToken) => {
  const row = await RefreshToken.findOne({
    where: { id: sessionId, userId, revoked: false },
  });
  if (!row) throw notFoundError("Không tìm thấy phiên đăng nhập");
  await row.update({ revoked: true, revokedAt: new Date() });
  return { revokedCurrent: currentRefreshToken ? row.token === currentRefreshToken : false };
};

export const revokeOtherSessionsService = async (userId, currentRefreshToken) => {
  const where = { userId, revoked: false };
  if (currentRefreshToken) where.token = { [Op.ne]: currentRefreshToken };
  const [count] = await RefreshToken.update(
    { revoked: true, revokedAt: new Date() },
    { where }
  );
  return { revokedCount: count };
};

export const listLoginHistoryService = async (userId, { page = 1, limit = 20, status } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const where = { userId };
  if (status) where.status = status;
  const { rows, count } = await LoginHistory.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });
  return {
    items: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit),
    },
  };
};

export const listActivityLogsService = async (userId, { page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const { rows, count } = await ActivityLog.findAndCountAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });
  return {
    items: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit),
    },
  };
};

export const changePasswordService = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findByPk(userId);
  if (!user) throw notFoundError("User không tồn tại");

  const ok = await comparePassword(currentPassword, user.hashedPassword);
  if (!ok) throw badRequest("Mật khẩu hiện tại không đúng");
  assertStrongPassword(newPassword, { email: user.email, username: user.username });

  const reused = await comparePassword(newPassword, user.hashedPassword);
  if (reused) throw badRequest("Mật khẩu mới không được trùng mật khẩu cũ");

  await sequelize.transaction(async (dbTx) => {
    await user.update(
      {
        hashedPassword: await hashPassword(newPassword),
        failedLoginCount: 0,
        lockedUntil: null,
        passwordChangedAt: new Date(),
      },
      { transaction: dbTx }
    );
    // logout het thiet bi khac
    await RefreshToken.update(
      { revoked: true, revokedAt: new Date() },
      { where: { userId, revoked: false }, transaction: dbTx }
    );
  });
};
