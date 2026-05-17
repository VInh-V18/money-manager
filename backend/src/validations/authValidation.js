import { z } from "zod";

export const signUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username tối thiểu 3 ký tự")
    .max(50, "Username tối đa 50 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Username chỉ gồm chữ, số, dấu gạch dưới"),
  email: z.string().email("Email không hợp lệ").max(255),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự"),
  displayName: z.string().min(1, "Vui lòng nhập họ tên").max(255),
});

export const signInSchema = z.object({
  // co the dang nhap bang username hoac email
  identifier: z.string().min(1, "Vui lòng nhập email hoặc username"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "OTP gồm 6 ký tự số"),
  // verify_email | reset_password
  purpose: z.enum(["verify_email", "reset_password"]),
});

export const resendOtpSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["verify_email", "reset_password"]),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  // resetToken duoc tra ve sau khi verify OTP thanh cong
  resetToken: z.string().min(10),
  newPassword: z.string().min(8).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional().nullable(),
  defaultCurrency: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
});
