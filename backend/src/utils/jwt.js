import jwt from "jsonwebtoken";
import crypto from "crypto";
import env from "../config/env.js";

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

export const signRefreshToken = (payload) =>
  jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET);

/**
 * 2FA challenge token — signed with JWT_2FA_SECRET (separate from JWT_ACCESS_SECRET).
 *
 * Using a separate secret prevents token-confusion: a 2FA challenge token verified
 * against JWT_ACCESS_SECRET would fail, so it cannot be used as an access token
 * in the Authorization header even if intercepted.
 */
export const sign2FAChallengeToken = (userId) =>
  jwt.sign({ id: userId, scope: "2fa_challenge" }, env.JWT_2FA_SECRET, { expiresIn: "5m" });

export const verify2FAChallengeToken = (token) => {
  const payload = jwt.verify(token, env.JWT_2FA_SECRET);
  if (payload.scope !== "2fa_challenge") throw new Error("Invalid 2FA token scope");
  return payload;
};
