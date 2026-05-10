# 📘 Hướng dẫn chạy Money Manager — Chi tiết từ A đến Z

> Dành cho người mới hoàn toàn (Windows + XAMPP). Đọc tuần tự từ trên xuống.

---

## 📦 PHẦN 0 — Kiểm tra phần mềm cần có

Mở **Command Prompt** (gõ `cmd` ở Start menu) và chạy 4 lệnh sau:

```bash
node --version
npm --version
git --version
```

Bạn cần thấy:
- `node` ≥ 18 (lý tưởng 20+)
- `npm` ≥ 9
- `git` (tuỳ chọn)

**Nếu chưa có Node:** tải ở https://nodejs.org/ — chọn bản LTS — cài next-next-finish.

**XAMPP:** tải ở https://www.apachefriends.org/ — chọn bản mới nhất — cài next-next-finish.

---

## 🗄️ PHẦN 1 — Setup Database (XAMPP)

### Bước 1.1: Mở XAMPP Control Panel

Tìm icon XAMPP trên desktop hoặc Start menu. Mở lên.

### Bước 1.2: Khởi động MySQL

Trong XAMPP Control Panel:
- Tìm dòng **MySQL** (cái thứ 2 từ trên xuống)
- Bấm nút **Start** màu vàng
- Chờ 3-5 giây → nút chuyển xanh + chữ "Running"

> ❌ **Nếu Start bị đỏ / không chạy được:**
> - Có thể port 3306 đang bị MySQL khác chiếm. Đóng MySQL Workbench / SSMS / process khác.
> - Hoặc chạy XAMPP với quyền **Run as Administrator** (chuột phải icon → Run as administrator).

### Bước 1.3: Tạo database

- Mở trình duyệt → vào **http://localhost/phpmyadmin**
- Cột bên trái → bấm **New** (chữ + nhỏ)
- Field "Database name": gõ `money_manager`
- Collation: chọn `utf8mb4_unicode_ci`
- Bấm **Create**
- Kết quả: thấy `money_manager` xuất hiện ở cột bên trái

✅ Tới đây database đã sẵn sàng.

---

## 🚀 PHẦN 2 — Chạy Backend

### Bước 2.1: Giải nén

Tải `money-manager-backend-full.zip` → giải nén ra một thư mục, ví dụ:

```
C:\Users\[ten-ban]\Desktop\money-manager-backend\
```

Bên trong sẽ thấy folder `full-backend-v3/` (hoặc tên tương tự). **Đó là folder backend.**

### Bước 2.2: Mở terminal trong folder backend

Có 3 cách:
1. **Cách dễ nhất:** Shift + chuột phải vào folder → "Open in Terminal" / "Open PowerShell window here"
2. Hoặc: gõ `cmd` vào thanh địa chỉ trong File Explorer khi đang ở trong folder đó
3. Hoặc dùng VSCode: File → Open Folder → chọn folder backend → Terminal → New Terminal

### Bước 2.3: Cài đặt dependencies

```bash
npm install
```

Chờ 1-3 phút (download ~200MB). Sẽ tạo folder `node_modules/`.

> ❌ **Nếu lỗi `npm not found`:** chưa cài Node hoặc chưa restart máy sau khi cài. Restart máy.

### Bước 2.4: Tạo file .env

```bash
copy .env.example .env
```

(Trên Mac/Linux dùng `cp` thay `copy`.)

### Bước 2.5: Mở file .env và sửa

Mở file `.env` bằng Notepad hoặc VSCode. Bạn sẽ thấy:

```env
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_NAME=money_manager
DB_USER=root
DB_PASSWORD=

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Email (tuỳ chọn — có thể bỏ trống cho dev)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
MAIL_FROM_NAME=Money Manager
MAIL_FROM_EMAIL=
```

**Quan trọng:**
- `DB_PASSWORD=` — XAMPP root mặc định KHÔNG có password → để trống
- `MAIL_USER=` và `MAIL_PASS=` — để trống cũng được. OTP sẽ in ra console (terminal) thay vì gửi email.

> 💡 **Mẹo:** Nếu muốn gửi email thật, vào https://myaccount.google.com/apppasswords → tạo App Password 16 ký tự → dán vào `MAIL_PASS`.

### Bước 2.6: Chạy server

```bash
npm run dev
```

Bạn sẽ thấy:
```
✓ Ket noi database thanh cong
✓ Dong bo bang thanh cong
✓ Cron jobs da khoi tao (3 jobs)

✓ Server chay tai http://localhost:5001
  Health check: http://localhost:5001/api/health
  API root: http://localhost:5001/api
```

✅ Backend đã chạy! **ĐỪNG ĐÓNG terminal này.**

> ❌ **Nếu lỗi `ECONNREFUSED ::1:3306`:** mở `.env` → đổi `DB_HOST=localhost` thành `DB_HOST=127.0.0.1` → lưu → restart `npm run dev` (Ctrl+C rồi chạy lại).
>
> ❌ **Nếu lỗi `Access denied for user 'root'@'localhost'`:** XAMPP của bạn có đặt password root. Mở phpMyAdmin → biết password → điền vào `DB_PASSWORD=` trong `.env`.

### Bước 2.7: Seed dữ liệu mẫu (optional nhưng khuyến nghị)

**Mở thêm 1 terminal mới** (giữ terminal cũ đang chạy server). Vào lại folder backend, chạy:

```bash
npm run seed
```

Bạn sẽ thấy:
```
✓ Da seed nguoi dung demo
✓ Da seed 18 danh muc
✓ Da seed 3 vi
✓ Da seed 30 giao dich mau
✓ Da seed 1 ngan sach, 1 muc tieu, 1 chi co dinh, 2 mau, 1 no
```

→ Bạn vừa có **demo account** và data sẵn để test:
- Email: `demo@money.local`
- Password: `Demo@1234`

### Bước 2.8: Test backend chạy ổn

Mở trình duyệt → http://localhost:5001/api/health → thấy:
```json
{"success":true,"data":{"status":"ok",...}}
```

✅ Backend hoàn chỉnh.

---

## 🎨 PHẦN 3 — Chạy Frontend

### Bước 3.1: Giải nén

Tải `money-manager-frontend-gd5.zip` → giải nén:

```
C:\Users\[ten-ban]\Desktop\money-manager-frontend\
```

### Bước 3.2: Mở terminal trong folder frontend

Mở **terminal mới** (vẫn giữ 2 terminal trước cho backend). Vào folder frontend.

### Bước 3.3: Cài đặt

```bash
npm install
```

Chờ 1-2 phút. Sẽ tải các package React, Tailwind, Recharts...

### Bước 3.4: Chạy dev server

```bash
npm run dev
```

Bạn sẽ thấy:
```
VITE v7.3.3  ready in 800 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Bước 3.5: Mở trình duyệt

Truy cập **http://localhost:5173**

Sẽ tự động chuyển sang `/signin`. Form đã prefill sẵn:
- Email: `demo@money.local`
- Password: `Demo@1234`

→ Bấm **Đăng nhập** → vào dashboard! 🎉

---

## 🧪 PHẦN 4 — Hành trình test 11 module

### Test 1: Dashboard
- Sau khi đăng nhập, sẽ vào trang chính
- Thấy: **Tổng số dư**, **Thu/Chi tháng**, biểu đồ biến động, pie chart, recent transactions
- Bấm icon mặt trăng góc phải → **dark mode**

### Test 2: Tạo ví mới
- Sidebar trái → **Ví tiền**
- Bấm **Thêm ví**
- Tên: "Vietcombank", Loại: "Ngân hàng", Số dư ban đầu: gõ `5000000` → tự format `5,000,000`
- Chọn màu xanh
- Bấm **Tạo ví** → ví hiện trong grid

### Test 3: Tạo giao dịch
- Sidebar → **Giao dịch** → bấm **Thêm giao dịch**
- Tab **Chi tiêu**
- Số tiền: `50000` → hiện `50,000`
- Ví: chọn ví vừa tạo
- Danh mục: "Ăn uống"
- Mô tả: "Cơm trưa"
- Bấm **Lưu** → list refresh, balance ví giảm

### Test 4: Filter giao dịch
- /transactions → bấm **Bộ lọc**
- Loại: Chi tiêu, Ví: Vietcombank, Từ ngày: chọn 1 tháng trước
- Badge filter hiện số `3`
- Bấm **Xoá bộ lọc** → reset

### Test 5: Tạo ngân sách
- Sidebar → **Ngân sách**
- **Thêm ngân sách**: Tên "Ăn uống tháng 5", Số tiền `2000000`, Chu kỳ "Hàng tháng"
- Lưu → thấy progress bar
- Tạo vài giao dịch ăn uống → quay lại budget → progress tăng

### Test 6: Mục tiêu tiết kiệm
- Sidebar → **Mục tiêu**
- Thêm: "Du lịch Đà Nẵng", Cần `5,000,000`, Đã có `0`, Hạn: chọn 3 tháng sau
- Lưu → thấy progress 0%, "X ngày, Y tiền/ngày"
- Bấm **Bỏ thêm tiền** → nhập 500k → progress lên

### Test 7: Quản lý nợ
- Sidebar → **Nợ** → tab "Tôi đi vay" / "Người khác nợ tôi"
- Thêm khoản: Type "owed_by_me", Người "Anh Nam", Số `1,000,000`
- Bấm **Trả nợ** → nhập 200k → chọn ví → **Xác nhận** → progress 20%, ví giảm 200k

### Test 8: Mẫu chi nhanh
- Sidebar → **Mẫu chi nhanh**
- Thêm mẫu: "Cà phê" + 25k + chọn icon coffee + ghim
- Bấm **Dùng** trên card → tạo giao dịch ngay → counter tăng

### Test 9: Chi cố định
- Sidebar → **Chi cố định**
- Thêm: "Tiền nhà", `3,000,000`, Hàng tháng, ngày 1
- Bấm **Chạy ngay** → tạo giao dịch nếu đến hạn

### Test 10: Báo cáo
- Sidebar → **Báo cáo**
- Chọn preset "30 ngày qua" → biểu đồ load
- Bấm **Excel** → tải file `bao-cao-2026-04-10_2026-05-10.xlsx`
- Mở Excel → thấy 2 sheet: "Giao dịch" và "Tổng hợp"
- Bấm **PDF** → tải file PDF

### Test 11: Thông báo
- Sidebar → **Thông báo**
- Tab "Chưa đọc" / "Tất cả"
- Bấm Check để mark read

### Test 12: Cài đặt
- Sidebar → **Cài đặt**
- Sửa "Họ tên" → **Lưu hồ sơ**
- Bấm icon máy ảnh trên avatar → upload ảnh → tự cập nhật
- Đổi giao diện Sáng/Tối
- Đổi mật khẩu (lưu ý: sau khi đổi sẽ bị logout)

---

## 🐛 PHẦN 5 — Bảng tra cứu lỗi

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| Backend `ECONNREFUSED ::1:3306` | XAMPP IPv6 | Đổi `DB_HOST=127.0.0.1` |
| Backend `Access denied root` | Có password XAMPP | Điền `DB_PASSWORD=` |
| Backend `Unknown database 'money_manager'` | Chưa tạo DB | Vào phpMyAdmin tạo |
| Backend `Port 5001 already in use` | App khác đang chiếm | Đổi `PORT=5002` trong `.env`, sửa luôn `vite.config.ts` của FE để baseURL match |
| Frontend `Network Error` | Backend chưa chạy | Mở http://localhost:5001/api/health kiểm tra |
| Frontend `CORS blocked` | `CLIENT_URL` sai | `.env` của BE phải có `CLIENT_URL=http://localhost:5173` |
| Frontend trắng màn hình | JS error | F12 mở DevTools → tab Console xem error |
| Đăng nhập 401 | Sai pass / chưa seed | Chạy `npm run seed` ở backend |
| Không gửi được OTP | Chưa cấu hình SMTP | Xem terminal backend — OTP in ra đó |
| Avatar upload fail | File > 5MB | Chọn ảnh nhỏ hơn |
| Build frontend lỗi `tsc` | Type error | `npx tsc -b` xem chi tiết |
| `npm install` cực chậm | Network chậm | Đổi mirror: `npm config set registry https://registry.npmmirror.com/` |
| Seeder báo "Demo user already exists" | Đã seed rồi | Bình thường, bỏ qua |

---

## 🔥 PHẦN 6 — Workflow phát triển hằng ngày

Mỗi lần code, **mở 3 terminal riêng biệt:**

**Terminal 1: MySQL**
- Mở XAMPP Control Panel → start MySQL

**Terminal 2: Backend**
```bash
cd path/to/backend
npm run dev
```
- Tự reload khi sửa code (nodemon)

**Terminal 3: Frontend**
```bash
cd path/to/frontend
npm run dev
```
- Vite HMR tự refresh trình duyệt

**Khi muốn dừng:** Ctrl+C ở mỗi terminal.

---

## 📦 PHẦN 7 — Build production để deploy

### Backend
```bash
cd backend
npm install --production
npm start
```

Backend production chạy bằng `node src/server.js` (không có nodemon).

### Frontend
```bash
cd frontend
npm run build
```

Tạo folder `dist/` ~1.6MB. Có 2 cách dùng:

**Cách 1: Serve trực tiếp**
```bash
npm run preview
```

**Cách 2: Deploy lên Vercel / Netlify**
- Upload folder `dist/` lên hosting
- Đổi `vite.config.ts` để build dùng đúng API URL production
- Hoặc Build Setting → Environment Variable: `VITE_API_URL=https://api.your-domain.com/api`

---

## ❓ FAQ

**Q: Tôi quên mật khẩu demo?**
A: Chạy lại `npm run seed`. Sẽ reset lại tài khoản demo.

**Q: Muốn xoá tất cả data và làm lại?**
A: Vào phpMyAdmin → drop database `money_manager` → tạo lại → restart backend → seed lại.

**Q: Có cần nodemon, ts-node, pm2 không?**
A: Không. Backend dùng Node ES Modules + nodemon (đã có trong package.json). FE dùng Vite. Không cần cài thêm gì.

**Q: Database backup ra file?**
A: phpMyAdmin → chọn DB → tab Export → SQL → Go → tải file `.sql`.

**Q: Đổi tiền tệ sang USD?**
A: Sửa `formatCurrency` trong `frontend/src/lib/utils.ts` + sửa `defaultCurrency` của user.

**Q: Tại sao OTP không gửi tới email?**
A: Bạn chưa cấu hình SMTP. OTP in ra terminal backend. Đọc nó thay cho mở email.

**Q: App có chạy được trên điện thoại không?**
A: Có. Frontend đã responsive. Trên mobile, sidebar ẩn → bấm icon menu để hiện.

---

**Chúc bạn code vui vẻ! Có lỗi gì copy nguyên error message gửi lại để debug.**
