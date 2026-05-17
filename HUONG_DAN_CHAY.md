
# Hướng Dẫn Chạy Money Manager

## Cách 1 — Docker (khuyến nghị)

### Yêu cầu
- Docker Desktop đang chạy

### Các bước

```bash
# 1. Sao chép file cấu hình
copy .env.example .env
copy backend\.env.docker.example backend\.env.docker

# 2. Điền giá trị thực vào backend\.env.docker
#    (JWT secrets, email, Gemini API key, OAuth credentials)

# 3. Build và khởi động
docker compose up -d --build

# 4. Kiểm tra
curl http://localhost/api/health
```

Ứng dụng chạy tại:
- Frontend: `http://localhost`
- Adminer (quản lý DB): `http://localhost:8080`

Để xem log backend:
```bash
docker compose logs -f backend
```

---

## Cách 2 — Chạy thủ công (dev)

### Yêu cầu
- Node.js 20+
- MySQL/MariaDB hoặc XAMPP

### Tạo database

```sql
CREATE DATABASE money_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Chạy backend

```bash
cd backend
npm install
copy .env.example .env
# Điền DB, JWT, email, Gemini vào .env
npm run dev
```

Backend chạy tại `http://localhost:5001`.

### Chạy frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend chạy tại `http://localhost:5173`.

---

## Cấu hình email (gửi OTP)

Dùng Gmail App Password (không phải mật khẩu đăng nhập):

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password
MAIL_FROM_NAME=Money Manager
```

Hướng dẫn tạo App Password: https://myaccount.google.com/apppasswords

---

## Cấu hình Gemini AI

Tạo API key tại https://aistudio.google.com, sau đó thêm vào `.env` (hoặc `backend/.env.docker`):

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.5-flash-lite,gemini-2.0-flash
```

