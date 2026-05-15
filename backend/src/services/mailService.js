import { getTransporter, mailFrom } from "../config/mail.js";
import { AppError } from "../utils/errors.js";

export const sendOtpEmail = async ({ to, code, purpose, displayName }) => {
  const transporter = getTransporter();

  const subject =
    purpose === "verify_email"
      ? "Xác nhận email - Money Manager"
      : "Khôi phục mật khẩu - Money Manager";

  const intro =
    purpose === "verify_email"
      ? "Cảm ơn bạn đã đăng ký! Vui lòng dùng mã OTP dưới đây để xác nhận email:"
      : "Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Mã OTP của bạn:";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="color: #2563eb;">Xin chào ${displayName || "bạn"}!</h2>
      <p>${intro}</p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${code}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với ai.</p>
    </div>
  `;

  if (!transporter) {
    throw new AppError(
      "Chưa cấu hình SMTP. Hãy thiết lập MAIL_USER và MAIL_PASS để gửi OTP qua email.",
      500
    );
  }

  return transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    html,
  });
};

export const sendNotificationEmail = async ({ to, title, message, severity = "info" }) => {
  const transporter = getTransporter();
  if (!transporter) return null;

  const color =
    severity === "danger" ? "#dc2626" : severity === "warning" ? "#d97706" : "#2563eb";

  return transporter.sendMail({
    from: mailFrom,
    to,
    subject: `${title} - Money Manager`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
        <h2 style="color:${color};margin:0 0 12px;">${title}</h2>
        <p style="font-size:15px;line-height:1.6;margin:0;">${message}</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">Ban nhan email nay vi da bat thong bao email trong Money Manager.</p>
      </div>
    `,
  });
};
