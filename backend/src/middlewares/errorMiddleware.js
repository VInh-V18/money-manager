import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, _next) => {
  // Known application errors — safe to expose message, no server log needed
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Sequelize validation/unique constraint
  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ",
      errors: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // JWT errors — token expiry is normal (client refreshes automatically), not an error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Token không hợp lệ" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token hết hạn" });
  }

  // CORS blocked — 400 is more appropriate than 500
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(400).json({ success: false, message: "Yêu cầu bị chặn bởi CORS" });
  }

  // Unexpected errors — log full details server-side, never expose internals to client
  logger.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
    userId: req.user?.id,
  });

  return res.status(500).json({
    success: false,
    message: "Lỗi server, vui lòng thử lại sau",
  });
};
