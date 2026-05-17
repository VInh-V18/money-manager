const makePath = (summary, tags = ["Core"], methods = ["get"]) => {
  const path = {};
  for (const method of methods) {
    path[method] = {
      tags,
      summary,
      security: method === "get" && summary.includes("Health") ? [] : [{ bearerAuth: [] }],
      responses: {
        200: { description: "Thành công" },
        400: { description: "Dữ liệu không hợp lệ" },
        401: { description: "Chưa đăng nhập hoặc token không hợp lệ" },
      },
    };
  }
  return path;
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Money Manager API",
    version: "1.0.0",
    description: "API quản lý thu chi, ví tiền, báo cáo, AI và bảo mật tài khoản.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/health": makePath("Health check", ["System"], ["get"]),
    "/auth/signup": makePath("Đăng ký tài khoản", ["Auth"], ["post"]),
    "/auth/signin": makePath("Đăng nhập", ["Auth"], ["post"]),
    "/auth/forgot-password": makePath("Gửi OTP quên mật khẩu", ["Auth"], ["post"]),
    "/auth/sessions": makePath("Quản lý phiên đăng nhập", ["Auth"], ["get"]),
    "/auth/login-history": makePath("Lịch sử đăng nhập", ["Auth"], ["get"]),
    "/auth/activity-logs": makePath("Nhật ký hoạt động", ["Auth"], ["get"]),
    "/wallets": makePath("Quản lý ví tiền", ["Wallets"], ["get", "post"]),
    "/wallets/transfer": makePath("Chuyển tiền giữa ví", ["Wallets"], ["post"]),
    "/wallets/{id}/balance-history": makePath("Lịch sử biến động số dư ví", ["Wallets"], ["get"]),
    "/categories": makePath("Quản lý danh mục", ["Categories"], ["get", "post"]),
    "/transactions": makePath("Quản lý giao dịch", ["Transactions"], ["get", "post"]),
    "/transactions/receipt": makePath("Upload ảnh hóa đơn giao dịch", ["Transactions"], ["post"]),
    "/transactions/receipt/ocr": makePath("OCR hóa đơn bằng Gemini Vision", ["Transactions"], ["post"]),
    "/transactions/trash": makePath("Thùng rác giao dịch", ["Transactions"], ["get"]),
    "/transactions/bulk": makePath("Xóa nhiều giao dịch", ["Transactions"], ["delete"]),
    "/transactions/{id}/restore": makePath("Khôi phục giao dịch đã xóa", ["Transactions"], ["post"]),
    "/budgets": makePath("Quản lý ngân sách", ["Budgets"], ["get", "post"]),
    "/fixed-expenses": makePath("Quản lý chi phí cố định", ["Fixed expenses"], ["get", "post"]),
    "/goals": makePath("Quản lý mục tiêu tiết kiệm", ["Goals"], ["get", "post"]),
    "/debts": makePath("Quản lý nợ", ["Debts"], ["get", "post"]),
    "/templates": makePath("Mẫu giao dịch nhanh", ["Templates"], ["get", "post"]),
    "/notifications": makePath("Thông báo", ["Notifications"], ["get"]),
    "/notifications/preferences": makePath("Cài đặt thông báo", ["Notifications"], ["get", "put"]),
    "/reports/overview": makePath("Dashboard tổng quan", ["Reports"], ["get"]),
    "/reports/range": makePath("Báo cáo theo khoảng thời gian", ["Reports"], ["get"]),
    "/reports/daily-stats": makePath("Thống kê thu chi theo ngày", ["Reports"], ["get"]),
    "/reports/weekly-stats": makePath("Thống kê dòng tiền theo tuần", ["Reports"], ["get"]),
    "/reports/forecast": makePath("Dự báo cuối tháng", ["Reports"], ["get"]),
    "/reports/export/excel": makePath("Xuất báo cáo Excel", ["Reports"], ["get"]),
    "/reports/export/csv": makePath("Xuất giao dịch CSV", ["Reports"], ["get"]),
    "/reports/export/pdf": makePath("Xuất báo cáo PDF", ["Reports"], ["get"]),
    "/reports/export/backup-json": makePath("Backup dữ liệu JSON", ["Reports"], ["get"]),
    "/reports/import/transactions-csv": makePath("Import giao dịch CSV", ["Reports"], ["post"]),
    "/reports/import/backup-json": makePath("Restore dữ liệu JSON", ["Reports"], ["post"]),
    "/admin/dashboard": makePath("Admin dashboard", ["Admin"], ["get"]),
    "/admin/users": makePath("Quản lý người dùng admin", ["Admin"], ["get"]),
    "/ai/chat": makePath("Chatbot tài chính", ["AI"], ["post"]),
    "/feedback": makePath("Gửi feedback hoặc báo lỗi", ["Feedback"], ["get", "post"]),
  },
};
