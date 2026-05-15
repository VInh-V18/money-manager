import { verifyAccessToken } from "../utils/jwt.js";
import { unauthorizedError } from "../utils/errors.js";
import { User } from "../models/index.js";

/**
 * Bao ve route private. Lay token tu header Authorization: Bearer ...
 * Sau khi verify -> gan req.user (instance User, da loai password)
 */
export const protectedRoute = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return next(unauthorizedError("Thieu access token"));
    }
    const token = auth.split(" ")[1];
    const payload = verifyAccessToken(token);

    const user = await User.findByPk(payload.id, {
      attributes: { exclude: ["hashedPassword"] },
    });
    if (!user) return next(unauthorizedError("User khong ton tai"));

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = (req, res, next) => {
  const allowed = new Set(["ADMIN", "SUPER_ADMIN", "SUPPORT", "AUDITOR"]);
  if (!req.user || !allowed.has(req.user.role)) {
    return res.status(403).json({ success: false, message: "Khong co quyen admin" });
  }
  next();
};

/**
 * Middleware bao dam resource thuoc ve user hien tai.
 * Dung sau protectedRoute. Nhan ten field trong req.params (mac dinh "id")
 * va Model -> tu dong load va check userId
 *
 * Cach dung:
 *   router.get("/:id", protectedRoute, ownerOnly(Wallet), controller.detail)
 */
export const ownerOnly = (Model, paramName = "id", attachAs = "resource") => {
  return async (req, res, next) => {
    try {
      const id = req.params[paramName];
      const item = await Model.findByPk(id);
      if (!item) {
        return res.status(404).json({ success: false, message: "Khong tim thay" });
      }
      if (item.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: "Khong co quyen" });
      }
      req[attachAs] = item;
      next();
    } catch (err) {
      next(err);
    }
  };
};
