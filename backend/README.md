# Money Manager — Backend (GĐ 1 + 2 + 3)

Backend đầy đủ 11 module cho website quản lý chi tiêu cá nhân.

**Stack:** Node.js (ES Modules) · Express 5 · Sequelize 6 · MySQL/MariaDB · JWT · Nodemailer · Multer · Helmet · Zod · ExcelJS · PDFKit · node-cron

**Trạng thái:** ✅ Backend hoàn chỉnh — tất cả 17 module trong prompt đã có endpoint.

---

## 🚀 Cài đặt với XAMPP

1. **Khởi động MySQL** trong XAMPP Control Panel
2. **Tạo database**: `http://localhost/phpmyadmin` → New → tên `money_manager`, collation `utf8mb4_unicode_ci`
3. **Cài deps & cấu hình:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
4. Mở `.env`, XAMPP root mặc định không có pass:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=money_manager
   DB_USER=root
   DB_PASSWORD=
   ```
   > 🚨 Nếu lỗi `ECONNREFUSED ::1:3306` → đổi `DB_HOST=127.0.0.1`
5. **Chạy server:**
   ```bash
   npm run dev
   ```
6. **Seed dữ liệu mẫu** (terminal khác):
   ```bash
   npm run seed
   ```
   → tài khoản demo: `demo@money.local` / `Demo@1234`
7. **Test API:** mở `API_TEST.http` trong VSCode (cài extension **REST Client**), bấm "Send Request"

---

## 📦 11 module API

| Module | Prefix | Mô tả |
|---|---|---|
| **Auth** | `/api/auth` | Đăng ký/đăng nhập + OTP + reset password + profile + avatar |
| **Wallet** | `/api/wallets` | CRUD ví + chuyển tiền + lịch sử |
| **Category** | `/api/categories` | CRUD danh mục cha-con |
| **Transaction** | `/api/transactions` | CRUD + filter + search + helpers theo giờ/ngày |
| **Budget** | `/api/budgets` | Ngân sách + tự tính spent/remaining + cảnh báo % |
| **FixedExpense** | `/api/fixed-expenses` | Chi cố định + cron tự sinh giao dịch |
| **Goal** | `/api/goals` | Mục tiêu tiết kiệm + tự tính suggested daily |
| **Debt** | `/api/debts` | Nợ + trả nợ (kèm tạo GD ví) + auto overdue |
| **Template** | `/api/templates` | Mẫu chi nhanh 1-click |
| **Notification** | `/api/notifications` | Thông báo trong app |
| **Report** | `/api/reports` | Dashboard + range + daily stats + so sánh + dự báo + export Excel/PDF |

---

## 🤖 Cron jobs tự động (3 jobs)

| Giờ chạy | Job | Mục đích |
|---|---|---|
| **00:05** | `fixedExpenseJob` | Quét chi cố định đến hạn → tạo GD + cộng/trừ ví + tạo notif |
| **09:00** | `budgetWarningJob` | Quét ngân sách vượt %warn / vượt 100% → tạo notif |
| **01:00** | `debtOverdueJob` | Cập nhật nợ quá hạn → tạo notif |

> Timezone: `Asia/Ho_Chi_Minh`. Test ngay bằng `POST /api/fixed-expenses/generate-due`.

---

## 🔥 Các điểm sáng kỹ thuật

### 1. Atomic balance updates
Mọi thay đổi giao dịch bọc trong `sequelize.transaction()` + `lock: dbTx.LOCK.UPDATE` trên ví → an toàn race condition.

### 2. Trả nợ tự động tạo GD ví
`POST /api/debts/:id/pay` với `walletId` → vừa cập nhật `paidAmount` vừa tạo expense/income tương ứng trong **một DB transaction**.

### 3. Template "1-click"
`POST /api/templates/:id/use` → dùng mẫu cà phê / trà sữa / xăng → tạo GD ngay, tự tăng `usageCount` để sort theo độ thường dùng.

### 4. Cron tránh duplicate
`fixedExpenseJob` luôn cập nhật `nextDueDate` ngay cả khi không tạo được GD (thiếu tiền) → không lặp cảnh báo mỗi ngày.

### 5. Báo cáo có dự báo
`GET /api/reports/forecast` lấy chi tiêu đầu tháng → ngày → tính avg → dự báo tổng cuối tháng → biết sớm có vượt thu nhập hay không.

### 6. Export Excel có 2 sheet
Sheet "Giao dịch" chi tiết + Sheet "Tổng hợp" → mở là dùng, không cần Pivot Table.

---

## 🗂️ Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/             env, database, mail
│   ├── controllers/        11 file controller
│   ├── jobs/               cronJobs.js
│   ├── middlewares/        auth, error, validate, upload
│   ├── models/             14 model + index.js
│   ├── routes/             5 file route
│   ├── services/           8 service (auth, transaction, budget,
│   │                       fixedExpense, report, export, notification, mail)
│   ├── seeders/
│   ├── utils/              jwt, bcrypt, response, date, errors, asyncHandler
│   ├── validations/        Zod schema
│   └── server.js
├── uploads/
├── API_TEST.http
├── .env.example
└── package.json
```

---

## 🛣️ Lộ trình

| Giai đoạn | Trạng thái | Nội dung |
|---|---|---|
| **GĐ 1 — Nền tảng** | ✅ | 14 model + seed |
| **GĐ 2 — Backend Core** | ✅ | Auth + Wallet + Category + Transaction |
| **GĐ 3 — Backend nâng cao** | ✅ | Budget + Fixed + Goal + Debt + Template + Notif + Report + Cron |
| GĐ 4 — Frontend Core | ⏳ | Layout + Dashboard + Wallet + Category + Transaction |
| GĐ 5 — Frontend còn lại | ⏳ | Phần còn lại + dark mode |

---

## 🐛 Troubleshooting

| Lỗi | Cách xử lý |
|---|---|
| `ECONNREFUSED ::1:3306` | Đổi `DB_HOST=127.0.0.1` |
| `Access denied for user 'root'` | XAMPP root không có pass → `DB_PASSWORD=` rỗng |
| `Unknown database` | Tạo DB trong phpMyAdmin |
| `Table doesn't exist` lần đầu | Chờ thấy log `✓ Dong bo bang thanh cong` |
| Email không gửi | OTP sẽ in ra console server |
| Port 5001 bị chiếm | Đổi `PORT=5002` trong `.env` |
| Cron không chạy 0h05 | Bình thường — chạy theo lịch. Test bằng endpoint `/api/fixed-expenses/generate-due` |

---

## 🧪 Flow test nhanh

### Mua cà phê 1-click
1. POST `/api/templates` mẫu "Cà phê" 25k pinned
2. POST `/api/templates/:id/use` → tự tạo GD, trừ ví
3. GET `/api/wallets` → balance giảm 25k

### Vượt ngân sách → notif
1. POST `/api/budgets` ngân sách "Ăn uống" 100k/tháng
2. POST nhiều GD ăn uống tổng > 100k
3. POST `/api/fixed-expenses/generate-due` (hoặc đợi 9h sáng)
4. GET `/api/notifications` → có notif vượt ngân sách

### Trả nợ
1. POST `/api/debts` `type: owed_by_me`, amount 1M
2. POST `/api/debts/:id/pay` `amount: 300k, walletId: 1`
3. GET `/api/debts/:id` → `paidAmount: 300000, remaining: 700000`
4. GET `/api/wallets` → ví 1 giảm 300k

### Export
1. GET `/api/reports/export/excel?fromDate=...&toDate=...` → tải Excel 2 sheet
2. GET `/api/reports/export/pdf?fromDate=...&toDate=...` → tải PDF

---

## 📊 Endpoints đầy đủ

### Auth
- `POST /signup`, `/signin`, `/signout`, `/refresh`
- `POST /verify-email`, `/resend-verify-otp`
- `POST /forgot-password`, `/verify-reset-otp`, `/reset-password`
- 🔒 `GET /me`, `PUT /profile`, `PUT /change-password`, `POST /avatar`

### Wallet 🔒
- `GET /` (kèm `totalBalance`), `POST /`, `POST /transfer`
- `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /:id/history`

### Category 🔒
- `GET /?type=expense`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`

### Transaction 🔒
- `GET /` (filter+pagination), `GET /recent`, `GET /search`
- `POST /`, `POST /daily-wage`, `POST /hourly-wage`
- `GET /:id`, `PUT /:id`, `DELETE /:id`

### Budget 🔒
- `GET /` (kèm spent/remaining/usedPercent)
- `GET /summary` (tổng quan)
- `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`

### FixedExpense 🔒
- `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`
- `POST /generate-due` (chạy cron tay)

### Goal 🔒
- `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`
- `POST /:id/add` (bỏ thêm tiền)

### Debt 🔒
- `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`
- `POST /:id/pay` (trả nợ + tạo GD ví tùy chọn)

### Template 🔒
- `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`
- `POST /:id/use` (tạo GD nhanh)

### Notification 🔒
- `GET /` (paged + unread filter)
- `GET /unread-count`
- `PUT /:id/read`, `PUT /mark-all-read`
- `DELETE /:id`, `DELETE /read-all`

### Report 🔒
- `GET /overview` (dashboard)
- `GET /range?fromDate=...&toDate=...`
- `GET /daily-stats` (cho biểu đồ line/bar)
- `GET /compare-months`
- `GET /forecast`
- `GET /preset-ranges`
- `GET /export/excel`, `GET /export/pdf`

---

**Tổng số:** ~70 endpoint • 11 module • 3 cron jobs • 2 định dạng export
