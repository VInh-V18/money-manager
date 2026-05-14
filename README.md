# Money Manager

Ứng dụng quản lý chi tiêu cá nhân gồm frontend React/Vite và backend Node.js/Express/MySQL.

## Cấu trúc

```text
money-manager-full/
  backend/   API Express, Sequelize, MySQL, JWT, Nodemailer
  frontend/  React, Vite, TypeScript, Tailwind CSS
```

## Yêu cầu

- Node.js 20+
- npm
- MySQL hoặc MariaDB, có thể dùng XAMPP

## Cài đặt nhanh

1. Tạo database MySQL:

```sql
CREATE DATABASE money_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Cấu hình backend:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Trên macOS/Linux dùng `cp .env.example .env`.

3. Cấu hình frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Mặc định frontend chạy ở `http://localhost:5173`, backend chạy ở `http://localhost:5001`.

## Biến môi trường quan trọng

- `backend/.env`: chứa database, JWT secret và SMTP. Không commit file này.
- `frontend/.env`: chứa `VITE_API_URL` và `VITE_BACKEND_URL`. Không commit file này.
- `*.env.example`: là file mẫu an toàn để commit lên GitHub.
- `GEMINI_API_KEY`: API key Gemini đặt trong `backend/.env`, dùng cho trang AI Tài chính.

## Email OTP

Chức năng quên mật khẩu gửi OTP qua SMTP thật. Nếu dùng Gmail, tạo App Password rồi điền vào `MAIL_USER` và `MAIL_PASS` trong `backend/.env`.

## AI Tài chính

Trang `/ai` dùng Gemini API để phân tích ví, giao dịch, ngân sách, mục tiêu, nợ và chi cố định của user đang đăng nhập. API key chỉ nằm ở backend:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

## Lệnh kiểm tra

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
npm run seed
npm run dev
```

## Trước khi đẩy lên GitHub

Kiểm tra không commit các file sau:

- `backend/.env`
- `frontend/.env`
- `node_modules/`
- `frontend/dist/`
- file log `*.log`
- thư mục upload runtime
