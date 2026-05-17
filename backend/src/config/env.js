import dotenv from "dotenv";
dotenv.config();

const t = (key, fallback = "") =>
  (process.env[key] || fallback).trim();

const env = {
  PORT: Number(t("PORT")) || 5001,
  NODE_ENV: t("NODE_ENV") || "development",
  API_PUBLIC_URL: t("API_PUBLIC_URL"),
  CLIENT_URL: t("CLIENT_URL") || "http://localhost:5173",
  CLIENT_URLS: (t("CLIENT_URLS") || t("CLIENT_URL") || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),

  DB_HOST: t("DB_HOST") || "localhost",
  DB_PORT: Number(t("DB_PORT")) || 3306,
  DB_NAME: t("DB_NAME") || "money_manager",
  DB_USER: t("DB_USER") || "root",
  DB_PASSWORD: t("DB_PASSWORD"),
  DB_SSL: t("DB_SSL") || "false",
  DB_SYNC_ALTER: t("DB_SYNC_ALTER") || "false",
  DB_SYNC_FORCE: t("DB_SYNC_FORCE") || "false",

  JWT_ACCESS_SECRET: t("JWT_ACCESS_SECRET") || "access_secret_change_me",
  JWT_REFRESH_SECRET: t("JWT_REFRESH_SECRET") || "refresh_secret_change_me",
  JWT_ACCESS_EXPIRES_IN: t("JWT_ACCESS_EXPIRES_IN") || "15m",
  JWT_REFRESH_EXPIRES_IN: t("JWT_REFRESH_EXPIRES_IN") || "7d",

  MAIL_HOST: t("MAIL_HOST") || "smtp.gmail.com",
  MAIL_PORT: Number(t("MAIL_PORT")) || 587,
  MAIL_USER: t("MAIL_USER"),
  MAIL_PASS: t("MAIL_PASS"),
  MAIL_FROM_NAME: t("MAIL_FROM_NAME") || "Money Manager",

  GEMINI_API_KEY: t("GEMINI_API_KEY"),
  GEMINI_MODEL: t("GEMINI_MODEL") || "gemini-2.5-flash",
  GEMINI_FALLBACK_MODELS: (t("GEMINI_FALLBACK_MODELS") || "gemini-2.5-flash-lite,gemini-2.0-flash")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),

  UPLOAD_DIR: t("UPLOAD_DIR") || "uploads",
  MAX_FILE_SIZE: Number(t("MAX_FILE_SIZE")) || 5 * 1024 * 1024,

  GOOGLE_CLIENT_ID: t("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: t("GOOGLE_CLIENT_SECRET"),
  FACEBOOK_CLIENT_ID: t("FACEBOOK_CLIENT_ID"),
  FACEBOOK_CLIENT_SECRET: t("FACEBOOK_CLIENT_SECRET"),
  GITHUB_CLIENT_ID: t("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: t("GITHUB_CLIENT_SECRET"),
};

export default env;
