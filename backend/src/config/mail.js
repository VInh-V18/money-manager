import nodemailer from "nodemailer";
import env from "./env.js";

let transporter = null;

export const getTransporter = () => {
  if (transporter) return transporter;

  if (!env.MAIL_USER || !env.MAIL_PASS) {
    console.warn("Chưa cấu hình MAIL_USER/MAIL_PASS, không thể gửi OTP qua email");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_PORT === 465,
    auth: { user: env.MAIL_USER, pass: env.MAIL_PASS },
    family: 4, // force IPv4, Render does not support IPv6 outbound
  });

  return transporter;
};

export const mailFrom = `"${env.MAIL_FROM_NAME}" <${env.MAIL_USER || "noreply@money.local"}>`;
