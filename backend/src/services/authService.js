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
import {
  AppError,
  badRequest,
  unauthorizedError,
  notFoundError,
  conflictError,
} from "../utils/errors.js";
import env from "../config/env.js";
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

/**
 * Dang ky:
 *   - Tao user (chua verify)
 *   - Tao OTP + gui email
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
        isVerified: false,
      },
      { transaction: dbTx }
    );

    // tao danh muc mac dinh cho user moi
    const cats = [
      ...DEFAULT_INCOME_CATS.map((c, i) => ({
        ...c,
        userId: user.id,
        type: "income",
        isSystem: true,
        sortOrder: i,
      })),
      ...DEFAULT_EXPENSE_CATS.map((c, i) => ({
        ...c,
        userId: user.id,
        type: "expense",
        isSystem: true,
        sortOrder: i,
      })),
    ];
    await Category.bulkCreate(cats, { transaction: dbTx });

    // tao OTP
    const code = generateOtp();
    await Otp.create(
      {
        userId: user.id,
        purpose: "verify_email",
        code,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
      { transaction: dbTx }
    );

    // gui mail (ngoai transaction de neu mail loi van OK)
    sendOtpEmail({
      to: email,
      code,
      purpose: "verify_email",
      displayName,
    }).catch((e) => console.error("Mail loi:", e.message));

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

  sendOtpEmail({
    to: email,
    code,
    purpose,
    displayName: user.displayName,
  }).catch((e) => console.error("Mail loi:", e.message));

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

  if (!user.isVerified) {
    throw new AppError("Tai khoan chua xac thuc email", 403, {
      requireVerification: true,
      email: user.email,
    });
  }

  const accessToken = signAccessToken({ id: user.id });
  const refreshToken = signRefreshToken({ id: user.id });

  await RefreshToken.create({
    userId: user.id,
    token: refreshToken,
    userAgent: userAgent?.slice(0, 500),
    ipAddress,
    expiresAt: addDays(new Date(), 7),
  });

  // strip password
  const safeUser = user.toJSON();
  delete safeUser.hashedPassword;

  return { user: safeUser, accessToken, refreshToken };
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
