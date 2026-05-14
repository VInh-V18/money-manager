# Hướng Dẫn Chạy Money Manager

## 1. Chuẩn bị

- Cài Node.js 20+
- Cài MySQL/MariaDB hoặc XAMPP
- Tạo database `money_manager` với collation `utf8mb4_unicode_ci`

```sql
CREATE DATABASE money_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. Chạy backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Mở `backend/.env` và cấu hình database, JWT secret, SMTP.

Backend mặc định chạy tại `http://localhost:5001`.

## 3. Chạy frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`.

## 4. Cấu hình gửi OTP qua email

Trong `backend/.env`, điền:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM_NAME=Money Manager
```

Với Gmail, `MAIL_PASS` là App Password, không phải mật khẩu đăng nhập Gmail.

## 5. Cấu hình Gemini AI

Tạo API key Gemini trong Google AI Studio, sau đó thêm vào `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Sau khi đổi `.env`, restart backend.

## 6. Seed dữ liệu demo

```bash
cd backend
npm run seed
```

Tài khoản demo mặc định:

```text
Email: demo@money.local
Password: Demo@1234
```
