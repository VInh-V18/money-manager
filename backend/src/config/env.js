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

  // No fallback — app must fail fast if these are missing
  JWT_ACCESS_SECRET: t("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: t("JWT_REFRESH_SECRET"),
  // Separate secret for 2FA challenge tokens prevents token-confusion attacks
  // (a 2FA challenge token cannot be used as an access token)
  JWT_2FA_SECRET: t("JWT_2FA_SECRET"),
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

  REDIS_URL: t("REDIS_URL"),

  UPLOAD_DIR: t("UPLOAD_DIR") || "uploads",
  MAX_FILE_SIZE: Number(t("MAX_FILE_SIZE")) || 5 * 1024 * 1024,

  GOOGLE_CLIENT_ID: t("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: t("GOOGLE_CLIENT_SECRET"),
  FACEBOOK_CLIENT_ID: t("FACEBOOK_CLIENT_ID"),
  FACEBOOK_CLIENT_SECRET: t("FACEBOOK_CLIENT_SECRET"),
  GITHUB_CLIENT_ID: t("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: t("GITHUB_CLIENT_SECRET"),
};

// Fail fast if secrets are missing — predictable defaults are a security risk
const REQUIRED = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const missing = REQUIRED.filter((k) => !env[k]);
if (missing.length > 0) {
  throw new Error(
    `[STARTUP] Missing required env vars: ${missing.join(", ")}. ` +
    "Set these in your .env file before starting the server."
  );
}

// Derive 2FA secret from access secret if not explicitly set.
// This is still safer than sharing the same secret because the derived value
// cannot be used to forge access tokens — the suffix changes the HMAC key.
if (!env.JWT_2FA_SECRET) {
  env.JWT_2FA_SECRET = env.JWT_ACCESS_SECRET + ":2fa";
}

export default env;
