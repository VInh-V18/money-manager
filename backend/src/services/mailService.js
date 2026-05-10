import { getTransporter, mailFrom } from "../config/mail.js";

/**
 * Gui mail OTP. Neu chua cau hinh SMTP, log ra console -> tien debug
 */
export const sendOtpEmail = async ({ to, code, purpose, displayName }) => {
  const transporter = getTransporter();

  const subject =
    purpose === "verify_email"
      ? "Xac nhan email - Money Manager"
      : "Khoi phuc mat khau - Money Manager";

  const intro =
    purpose === "verify_email"
      ? "Cam on ban da dang ky! Vui long dung ma OTP duoi day de xac nhan email:"
      : "Chung toi nhan duoc yeu cau dat lai mat khau. Ma OTP cua ban:";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="color: #2563eb;">Xin chao ${displayName || "ban"}!</h2>
      <p>${intro}</p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${code}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Ma co hieu luc trong 10 phut. Khong chia se ma nay voi ai.</p>
    </div>
  `;

  if (!transporter) {
    // chua cau hinh SMTP -> log de demo
    console.log(`\n[MAIL-DEV] To: ${to} | Purpose: ${purpose} | OTP: ${code}\n`);
    return { mocked: true };
  }

  return transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    html,
  });
};
