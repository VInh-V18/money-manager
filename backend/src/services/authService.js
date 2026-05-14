/**
 * Service auth: tach logic phuc tap khoi controller
 */
import crypto from "crypto";
import { Op } from "sequelize";
import {
  User,
  Otp,
  RefreshToken,
  Category,
  sequelize,
} from "../models/index.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
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

const DEFAULT_INCOME_CATS = [
  { name: "Luong", icon: "briefcase", color: "#10B981" },
  { name: "Thuong", icon: "gift", color: "#10B981" },
  { name: "Lam them", icon: "clock", color: "#10B981" },
  { name: "Freelance", icon: "laptop", color: "#10B981" },
  { name: "Ban hang", icon: "shopping-bag", color: "#10B981" },
  { name: "Duoc cho", icon: "heart", color: "#10B981" },
  { name: "Hoan tien", icon: "rotate-ccw", color: "#10B981" },
  { name: "Khac", icon: "more-horizontal", color: "#10B981" },
];

const DEFAULT_EXPENSE_CATS = [
  { name: "An uong", icon: "utensils", color: "#EF4444" },
  { name: "Di lai", icon: "car", color: "#F97316" },
  { name: "Nha o", icon: "home", color: "#A855F7" },
  { name: "Hoc tap", icon: "book", color: "#3B82F6" },
  { name: "Giai tri", icon: "music", color: "#EC4899" },
  { name: "Mua sam", icon: "shopping-cart", color: "#F59E0B" },
  { name: "Suc khoe", icon: "heart-pulse", color: "#14B8A6" },
  { name: "Gia dinh", icon: "users", color: "#8B5CF6" },
  { name: "Tra no", icon: "credit-card", color: "#DC2626" },
  { name: "Khac", icon: "more-horizontal", color: "#6B7280" },
];

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

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

const safeUserJson = (user) => {
  const safeUser = user.toJSON();
  delete safeUser.hashedPassword;
  return safeUser;
};

const issueSession = async (user, { userAgent, ipAddress } = {}) => {
  const accessToken = signAccessToken({ id: user.id });
  const refreshToken = signRefreshToken({ id: user.id });

  await RefreshToken.create({
    userId: user.id,
    token: refreshToken,
    userAgent: userAgent?.slice(0, 500),
    ipAddress,
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
  // check trung username/email
  const existing = await User.findOne({
    where: { [Op.or]: [{ email }, { username }] },
  });
  if (existing) {
    throw conflictError(
      existing.email === email
        ? "Email da duoc dang ky"
        : "Username da duoc su dung"
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
  if (!user) throw notFoundError("Email khong ton tai");

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
  if (!otp) throw badRequest("OTP khong dung hoac da het han");

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
  if (!user) throw notFoundError("Email khong ton tai");

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
  if (!user) throw notFoundError("Email khong ton tai");

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
  if (!tokenRow) throw badRequest("Reset token khong hop le hoac da het han");

  await sequelize.transaction(async (dbTx) => {
    await user.update(
      { hashedPassword: await hashPassword(newPassword) },
      { transaction: dbTx }
    );
    await tokenRow.update({ used: true }, { transaction: dbTx });
    // logout het thiet bi cu
    await RefreshToken.update(
      { revoked: true },
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
  if (!user) throw unauthorizedError("Sai thong tin dang nhap");

  const ok = await comparePassword(password, user.hashedPassword);
  if (!ok) throw unauthorizedError("Sai thong tin dang nhap");

  return issueSession(user, { userAgent, ipAddress });
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
      email,
      displayName: profile.name || profile.login || email,
      avatarUrl: profile.avatar_url || null,
    }),
  },
};

const getOAuthProvider = (provider) => {
  const config = oauthProviders[provider];
  if (!config) throw badRequest("Nha cung cap OAuth khong hop le");
  if (!config.clientId() || !config.clientSecret()) {
    throw badRequest(`Chua cau hinh OAuth ${provider}`);
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
    throw unauthorizedError(data.error_description || "Khong lay duoc OAuth access token");
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
  if (!profileRes.ok) throw unauthorizedError("Khong lay duoc thong tin OAuth user");

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
  if (!profile.email) throw unauthorizedError("Tai khoan OAuth khong co email da xac thuc");

  let user = await User.findOne({ where: { email: profile.email } });
  if (!user) {
    user = await sequelize.transaction(async (dbTx) => {
      const createdUser = await User.create(
        {
          username: await makeOAuthUsername(profile.email),
          email: profile.email,
          hashedPassword: await hashPassword(crypto.randomBytes(32).toString("hex")),
          displayName: profile.displayName || profile.email,
          avatarUrl: profile.avatarUrl,
          isVerified: true,
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

  return issueSession(user, { userAgent, ipAddress });
};

export const refreshTokenService = async (oldToken) => {
  const row = await RefreshToken.findOne({
    where: { token: oldToken, revoked: false },
  });
  if (!row) throw unauthorizedError("Refresh token khong hop le");
  if (row.expiresAt < new Date()) {
    throw unauthorizedError("Refresh token het han");
  }

  // verify chu ky
  const { verifyRefreshToken } = await import("../utils/jwt.js");
  let payload;
  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    throw unauthorizedError("Refresh token sai chu ky");
  }
  if (payload.id !== row.userId) {
    throw unauthorizedError("Refresh token khong khop");
  }

  const user = await User.findByPk(row.userId);
  if (!user) throw unauthorizedError("User khong ton tai");

  const accessToken = signAccessToken({ id: user.id });
  return { accessToken };
};

export const signOutService = async (refreshToken) => {
  if (!refreshToken) return;
  await RefreshToken.update(
    { revoked: true },
    { where: { token: refreshToken } }
  );
};

export const changePasswordService = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findByPk(userId);
  if (!user) throw notFoundError("User khong ton tai");

  const ok = await comparePassword(currentPassword, user.hashedPassword);
  if (!ok) throw badRequest("Mat khau hien tai khong dung");

  await sequelize.transaction(async (dbTx) => {
    await user.update(
      { hashedPassword: await hashPassword(newPassword) },
      { transaction: dbTx }
    );
    // logout het thiet bi khac
    await RefreshToken.update(
      { revoked: true },
      { where: { userId, revoked: false }, transaction: dbTx }
    );
  });
};
