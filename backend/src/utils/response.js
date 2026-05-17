/**
 * Tat ca response API tra theo dinh dang chuan:
 * { success: boolean, data?, message?, errors? }
 */

export const ok = (res, data = null, message = null, status = 200) => {
  return res.status(status).json({
    success: true,
    ...(message ? { message } : {}),
    data,
  });
};

export const created = (res, data, message = "Tạo thành công") => {
  return ok(res, data, message, 201);
};

export const fail = (res, message = "Có lỗi xảy ra", status = 400, errors = null) => {
  return res.status(status).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
};

export const unauthorized = (res, message = "Chưa đăng nhập") => {
  return fail(res, message, 401);
};

export const forbidden = (res, message = "Không có quyền truy cập") => {
  return fail(res, message, 403);
};

export const notFound = (res, message = "Không tìm thấy") => {
  return fail(res, message, 404);
};
