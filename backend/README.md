# Money Manager Backend

Backend Express cho ứng dụng quản lý chi tiêu cá nhân.

## Stack

- Node.js, Express 5
- Sequelize, MySQL/MariaDB
- JWT authentication
- Nodemailer SMTP cho OTP quên mật khẩu
- Gemini API cho AI tài chính cá nhân
- ExcelJS/PDFKit cho export báo cáo

## Cài đặt

```bash
npm install
copy .env.example .env
npm run dev
```

Trên macOS/Linux dùng `cp .env.example .env`.

## Database

```sql
CREATE DATABASE money_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Email OTP

OTP quên mật khẩu được gửi qua SMTP thật. Cấu hình trong `.env`:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM_NAME=Money Manager
```

Không commit `.env` lên GitHub.

## Gemini AI

Trang AI gọi backend qua `/api/ai/*`; backend gọi Gemini bằng API key trong `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

## Scripts

- `npm run dev`: chạy server với nodemon
- `npm start`: chạy server production
- `npm run seed`: tạo dữ liệu demo
