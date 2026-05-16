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

// Token ngan han dung cho buoc challenge 2FA (5 phut)
export const sign2FAChallengeToken = (userId) =>
  jwt.sign({ id: userId, scope: "2fa_challenge" }, env.JWT_ACCESS_SECRET, { expiresIn: "5m" });

export const verify2FAChallengeToken = (token) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.scope !== "2fa_challenge") throw new Error("Invalid 2FA token");
  return payload;
};
