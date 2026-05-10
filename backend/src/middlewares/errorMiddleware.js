import { AppError } from "../utils/errors.js";
import env from "../config/env.js";

// 404 - khong tim thay route
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Khong tim thay endpoint ${req.method} ${req.originalUrl}`,
  });
};

// xu ly loi tap trung
export const errorHandler = (err, req, res, next) => {
  // log loi server
  if (env.NODE_ENV === "development") {
    console.error("[ERROR]", err);
  } else {
    console.error("[ERROR]", err.message);
  }

  // loi do minh tu nem
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // loi validate cua sequelize
  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      success: false,
      message: "Du lieu khong hop le",
      errors: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // loi JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Token khong hop le" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token het han" });
  }

  // loi unknown -> 500
  return res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === "development" ? err.message : "Loi server, vui long thu lai",
    ...(env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
