export class AppError extends Error {
  constructor(message, statusCode = 400, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const badRequest = (msg, errors) => new AppError(msg, 400, errors);
export const unauthorizedError = (msg = "Chua dang nhap") => new AppError(msg, 401);
export const forbiddenError = (msg = "Khong co quyen") => new AppError(msg, 403);
export const notFoundError = (msg = "Khong tim thay") => new AppError(msg, 404);
export const conflictError = (msg) => new AppError(msg, 409);
