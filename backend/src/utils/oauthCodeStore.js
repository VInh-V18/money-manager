/**
 * Short-lived one-time code store for OAuth token exchange.
 *
 * Keeps access tokens out of redirect URLs (OWASP A07).
 * After OAuth, we redirect with a short-lived opaque code; the frontend
 * exchanges the code for the actual token via a POST request.
 *
 * Uses Redis when available, falls back to in-memory Map.
 * TTL is intentionally short (60s) — enough for the frontend JS to run.
 */
import crypto from "crypto";
import { cache } from "../libs/redis.js";

const TTL_SECONDS = 60;
const CACHE_PREFIX = "oauth_code:";

// In-memory fallback when Redis is not configured
const memStore = new Map(); // code -> { accessToken, refreshToken, expiresAt }

const memSet = (code, value) => {
  memStore.set(code, { ...value, expiresAt: Date.now() + TTL_SECONDS * 1000 });
};

const memGet = (code) => {
  const entry = memStore.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memStore.delete(code);
    return null;
  }
  return entry;
};

const memDel = (code) => memStore.delete(code);

// Purge expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of memStore.entries()) {
    if (now > val.expiresAt) memStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

/**
 * Store OAuth tokens and return a one-time code.
 */
export const createOAuthCode = async ({ accessToken, refreshToken }) => {
  const code = crypto.randomBytes(32).toString("hex");
  const value = { accessToken, refreshToken };

  await cache.set(`${CACHE_PREFIX}${code}`, value, TTL_SECONDS);
  // Always set in-memory too as fallback
  memSet(code, value);

  return code;
};

/**
 * Exchange a one-time code for tokens. Deletes the code after use.
 * Returns null if code is invalid or expired.
 */
export const consumeOAuthCode = async (code) => {
  if (!code || typeof code !== "string" || !/^[0-9a-f]{64}$/.test(code)) {
    return null;
  }

  // Try Redis first
  const redisVal = await cache.get(`${CACHE_PREFIX}${code}`);
  if (redisVal) {
    await cache.del(`${CACHE_PREFIX}${code}`);
    memDel(code); // clean both stores
    return redisVal;
  }

  // Fallback to in-memory
  const memVal = memGet(code);
  if (memVal) {
    memDel(code);
    return memVal;
  }

  return null;
};
