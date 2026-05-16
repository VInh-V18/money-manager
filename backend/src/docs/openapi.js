const makePath = (summary, tags = ["Core"], methods = ["get"]) => {
  const path = {};
  for (const method of methods) {
    path[method] = {
      tags,
      summary,
      security: method === "get" && summary.includes("Health") ? [] : [{ bearerAuth: [] }],
      responses: {
        200: { description: "Thanh cong" },
        400: { description: "Du lieu khong hop le" },
        401: { description: "Chua dang nhap hoac token khong hop le" },
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
    description: "API quan ly thu chi, vi tien, bao cao, AI va bao mat tai khoan.",
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
    "/auth/signup": makePath("Dang ky tai khoan", ["Auth"], ["post"]),
    "/auth/signin": makePath("Dang nhap", ["Auth"], ["post"]),
    "/auth/forgot-password": makePath("Gui OTP quen mat khau", ["Auth"], ["post"]),
    "/auth/sessions": makePath("Quan ly phien dang nhap", ["Auth"], ["get"]),
    "/auth/login-history": makePath("Lich su dang nhap", ["Auth"], ["get"]),
    "/auth/activity-logs": makePath("Nhat ky hoat dong", ["Auth"], ["get"]),
    "/wallets": makePath("Quan ly vi tien", ["Wallets"], ["get", "post"]),
    "/wallets/transfer": makePath("Chuyen tien giua vi", ["Wallets"], ["post"]),
    "/wallets/{id}/balance-history": makePath("Lich su bien dong so du vi", ["Wallets"], ["get"]),
    "/categories": makePath("Quan ly danh muc", ["Categories"], ["get", "post"]),
    "/transactions": makePath("Quan ly giao dich", ["Transactions"], ["get", "post"]),
    "/transactions/receipt": makePath("Upload anh hoa don giao dich", ["Transactions"], ["post"]),
    "/transactions/trash": makePath("Thung rac giao dich", ["Transactions"], ["get"]),
    "/transactions/bulk": makePath("Xoa nhieu giao dich", ["Transactions"], ["delete"]),
    "/transactions/{id}/restore": makePath("Khoi phuc giao dich da xoa", ["Transactions"], ["post"]),
    "/budgets": makePath("Quan ly ngan sach", ["Budgets"], ["get", "post"]),
    "/fixed-expenses": makePath("Quan ly chi phi co dinh", ["Fixed expenses"], ["get", "post"]),
    "/goals": makePath("Quan ly muc tieu tiet kiem", ["Goals"], ["get", "post"]),
    "/debts": makePath("Quan ly no", ["Debts"], ["get", "post"]),
    "/templates": makePath("Mau giao dich nhanh", ["Templates"], ["get", "post"]),
    "/notifications": makePath("Thong bao", ["Notifications"], ["get"]),
    "/notifications/preferences": makePath("Cai dat thong bao", ["Notifications"], ["get", "put"]),
    "/reports/overview": makePath("Dashboard tong quan", ["Reports"], ["get"]),
    "/reports/range": makePath("Bao cao theo khoang thoi gian", ["Reports"], ["get"]),
    "/reports/daily-stats": makePath("Thong ke thu chi theo ngay", ["Reports"], ["get"]),
    "/reports/weekly-stats": makePath("Thong ke dong tien theo tuan", ["Reports"], ["get"]),
    "/reports/forecast": makePath("Du bao cuoi thang", ["Reports"], ["get"]),
    "/reports/export/excel": makePath("Xuat bao cao Excel", ["Reports"], ["get"]),
    "/reports/export/csv": makePath("Xuat giao dich CSV", ["Reports"], ["get"]),
    "/reports/export/pdf": makePath("Xuat bao cao PDF", ["Reports"], ["get"]),
    "/reports/export/backup-json": makePath("Backup du lieu JSON", ["Reports"], ["get"]),
    "/reports/import/transactions-csv": makePath("Import giao dich CSV", ["Reports"], ["post"]),
    "/reports/import/backup-json": makePath("Restore du lieu JSON", ["Reports"], ["post"]),
    "/admin/dashboard": makePath("Admin dashboard", ["Admin"], ["get"]),
    "/admin/users": makePath("Quan ly nguoi dung admin", ["Admin"], ["get"]),
    "/ai/chat": makePath("Chatbot tai chinh", ["AI"], ["post"]),
    "/feedback": makePath("Gui feedback hoac bao loi", ["Feedback"], ["get", "post"]),
  },
};
