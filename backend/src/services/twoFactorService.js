import crypto from "crypto";
import * as OTPAuth from "otpauth";
import qrcode from "qrcode";
import { User, TwoFactorBackupCode } from "../models/index.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { badRequest, unauthorizedError } from "../utils/errors.js";

const APP_NAME = "Money Manager";
const BACKUP_CODE_COUNT = 10;

const generateRawCode = () => crypto.randomBytes(5).toString("hex"); // 10 ky tu hex

const makeTOTP = (secret) =>
  new OTPAuth.TOTP({ issuer: APP_NAME, algorithm: "SHA1", digits: 6, period: 30, secret });

// Tao secret + QR code URL, chua luu vao DB (user phai verify truoc)
export const generate2FASecret = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw badRequest("Người dùng không tồn tại");
  if (user.twoFactorEnabled) throw badRequest("2FA đã được bật");

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ issuer: APP_NAME, label: user.email, algorithm: "SHA1", digits: 6, period: 30, secret });
  const otpAuthUrl = totp.toString();
  const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

  await user.update({ twoFactorSecret: secret.base32 });

  return { secret: secret.base32, qrCodeDataUrl, otpAuthUrl };
};

// Xac nhan token TOTP va bat 2FA, tra ve backup codes
export const enable2FA = async (userId, token) => {
  const user = await User.findByPk(userId);
  if (!user) throw badRequest("Người dùng không tồn tại");
  if (user.twoFactorEnabled) throw badRequest("2FA đã được bật");
  if (!user.twoFactorSecret) throw badRequest("Chưa tạo 2FA secret, gọi /2fa/setup trước");

  const totp = makeTOTP(OTPAuth.Secret.fromBase32(user.twoFactorSecret));
  const delta = totp.validate({ token: String(token), window: 1 });
  if (delta === null) throw badRequest("Mã TOTP không đúng hoặc đã hết hạn");

  await user.update({ twoFactorEnabled: true });

  const backupCodes = await _generateBackupCodes(userId);
  return { backupCodes };
};

// Tat 2FA sau khi xac nhan mat khau
export const disable2FA = async (userId, password) => {
  const user = await User.findByPk(userId);
  if (!user) throw badRequest("Người dùng không tồn tại");
  if (!user.twoFactorEnabled) throw badRequest("2FA chưa được bật");

  const isPasswordValid = await comparePassword(password, user.hashedPassword);
  if (!isPasswordValid) throw unauthorizedError("Mật khẩu không đúng");

  await user.update({ twoFactorEnabled: false, twoFactorSecret: null });
  await TwoFactorBackupCode.destroy({ where: { userId } });

  return { message: "Đã tắt 2FA thành công" };
};

// Xac nhan TOTP token khi dang nhap
export const verify2FAToken = async (userId, token) => {
  const user = await User.findByPk(userId);
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw badRequest("2FA chưa được cấu hình");
  }

  const totp = makeTOTP(OTPAuth.Secret.fromBase32(user.twoFactorSecret));
  const delta = totp.validate({ token: String(token), window: 1 });
  if (delta === null) throw unauthorizedError("Mã TOTP không đúng hoặc đã hết hạn");

  return true;
};

// Dung backup code khi mat dien thoai
export const useBackupCode = async (userId, rawCode) => {
  const user = await User.findByPk(userId);
  if (!user || !user.twoFactorEnabled) throw badRequest("2FA chưa được bật");

  const codes = await TwoFactorBackupCode.findAll({
    where: { userId, usedAt: null },
  });

  for (const code of codes) {
    const match = await comparePassword(rawCode.trim().toLowerCase(), code.codeHash);
    if (match) {
      await code.update({ usedAt: new Date() });
      return true;
    }
  }

  throw unauthorizedError("Backup code không đúng hoặc đã được sử dụng");
};

// Tao lai backup codes (xoa cu, tao moi)
export const regenerateBackupCodes = async (userId, password) => {
  const user = await User.findByPk(userId);
  if (!user) throw badRequest("Người dùng không tồn tại");
  if (!user.twoFactorEnabled) throw badRequest("2FA chưa được bật");

  const isPasswordValid = await comparePassword(password, user.hashedPassword);
  if (!isPasswordValid) throw unauthorizedError("Mật khẩu không đúng");

  await TwoFactorBackupCode.destroy({ where: { userId } });
  const backupCodes = await _generateBackupCodes(userId);
  return { backupCodes };
};

// ---- internal ----
const _generateBackupCodes = async (userId) => {
  const rawCodes = Array.from({ length: BACKUP_CODE_COUNT }, generateRawCode);

  const rows = await Promise.all(
    rawCodes.map(async (code) => ({
      userId,
      codeHash: await hashPassword(code),
    }))
  );

  await TwoFactorBackupCode.bulkCreate(rows);
  return rawCodes; // chi hien 1 lan khi tao, user phai luu lai
};
