import { z } from "zod";

export const signUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username toi thieu 3 ky tu")
    .max(50, "Username toi da 50 ky tu")
    .regex(/^[a-zA-Z0-9_]+$/, "Username chi gom chu, so, dau gach duoi"),
  email: z.string().email("Email khong hop le").max(255),
  password: z
    .string()
    .min(8, "Mat khau toi thieu 8 ky tu")
    .max(100, "Mat khau toi da 100 ky tu"),
  displayName: z.string().min(1, "Vui long nhap ho ten").max(255),
});

export const signInSchema = z.object({
  // co the dang nhap bang username hoac email
  identifier: z.string().min(1, "Vui long nhap email hoac username"),
  password: z.string().min(1, "Vui long nhap mat khau"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "OTP gom 6 ky tu so"),
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
