# Money Manager — Frontend (GĐ 5 — Hoàn chỉnh)

Frontend đầy đủ 12 trang cho website quản lý chi tiêu cá nhân, đã làm xong toàn bộ 11 module backend.

**Stack:** React 19 · TypeScript · Vite · Tailwind v4 · Radix UI · Zustand · React Router 7 · React Hook Form + Zod · Axios · Sonner · Recharts · Lucide

---

## 📊 Trạng thái

| Module | Trạng thái |
|---|---|
| Layout (Sidebar/Header/AppLayout) | ✅ |
| Auth (SignIn/SignUp/VerifyEmail/ForgotPassword) | ✅ |
| Dashboard (4 cards + AreaChart + PieChart + Recent) | ✅ |
| Wallets (CRUD + form modal) | ✅ |
| Categories (Tabs Thu/Chi + form) | ✅ |
| Transactions (Filter + Pagination + form) | ✅ |
| Budgets (Progress bar + cảnh báo) | ✅ |
| FixedExpenses (CRUD + chạy cron tay) | ✅ |
| Goals (Progress + suggestedDaily + add money) | ✅ |
| Debts (Tabs + Pay action + chọn ví) | ✅ |
| Templates (Pinned + 1-click use) | ✅ |
| Reports (Range picker + 4 charts + Excel/PDF) | ✅ |
| Notifications (Filter unread + mark read) | ✅ |
| Settings (Profile + Avatar + Theme + Password) | ✅ |

---

## 🚀 Chạy nhanh

> ⚠️ Backend phải chạy trước

```bash
npm install
npm run dev
```

Mở **http://localhost:5173** → form prefill demo (`demo@money.local` / `Demo@1234`)

> 📘 **Chi tiết hướng dẫn từ A đến Z:** xem `HUONG_DAN_CHAY.md`

---

## 🔥 Các điểm sáng kỹ thuật

### 1. Atomic Pay Debt — call duy nhất, 2 việc
`POST /debts/:id/pay` với `walletId` → cập nhật nợ + tạo GD ví trong 1 DB transaction. UI gọi 1 API duy nhất.

### 2. Template `usageCount` tự sort
Mẫu được dùng nhiều tự lên đầu. UX tự cải thiện theo thời gian.

### 3. Forecast tháng
`/reports/forecast` → projected dựa trên avg đầu tháng → biết trước có vượt thu nhập không.

### 4. Auto theme apply trước render
`main.tsx` apply theme từ localStorage trước khi React render → không có flash trắng/đen.

### 5. Filter có badge số filter active
Người dùng biết ngay đang lọc gì. Bấm "Xoá bộ lọc" reset.

### 6. Recharts dùng CSS variables
Đổi theme → biểu đồ tự đổi màu.

### 7. CurrencyInput tự format
Gõ `50000` → hiện `50,000` realtime, backend nhận số nguyên.

### 8. Auto refresh access token
Backend trả 401 → axios tự gọi `/auth/refresh` → retry. User không thấy gián đoạn.

### 9. Mobile-first responsive
Sidebar ẩn dưới `lg:` (1024px), overlay khi mở. Form modal max-h-90vh + overflow-y-auto.

### 10. Type-safe đầu cuối
TypeScript types đồng bộ với backend response. `tsc -b` 0 lỗi.

---

## 🗂️ Cấu trúc thư mục

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Button, Input, Card, Dialog, Select, Avatar (+Badge/Separator/Skeleton),
│   │   │                    # DropdownMenu, Progress (+Tabs)
│   │   ├── layout/          # Sidebar (12 nav), Header (dropdown user, dark toggle), AppLayout
│   │   ├── auth/            # ProtectedRoute
│   │   ├── common/          # CurrencyInput, EmptyState, ConfirmDialog, IconBubble, PageHeader
│   │   ├── wallet/          # WalletFormDialog
│   │   └── transaction/     # TransactionFormDialog
│   ├── lib/
│   │   ├── axios.ts         # Auto refresh interceptor + getErrorMessage
│   │   └── utils.ts         # cn, formatCurrency (VND), formatDate, formatRelative
│   ├── pages/               # 4 auth + 12 main pages
│   ├── services/            # auth, wallet+category, transaction, report, moduleServices
│   ├── stores/              # useAuthStore (persist), useThemeStore
│   ├── types/               # Type cho 11 module
│   ├── App.tsx              # 16 routes
│   ├── main.tsx
│   └── index.css            # Tailwind v4 + theme tài chính
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── components.json
├── package.json
└── HUONG_DAN_CHAY.md        # Hướng dẫn chi tiết từ A đến Z
```

---

## 🛣️ Luồng test đầy đủ

### Workflow A: Tạo dữ liệu
1. Đăng nhập demo
2. **Wallets** → tạo "Vietcombank" 5tr
3. **Categories** → kiểm tra 18 cat đã seed (Ăn uống, Đi lại...)
4. **Transactions** → tạo 5 giao dịch chi tiêu khác nhau

### Workflow B: Quản lý
5. **Budgets** → tạo "Ăn uống tháng" 2tr → vài giao dịch để progress chạy
6. **Goals** → "Du lịch" 5tr → bỏ thêm tiền 500k
7. **FixedExpenses** → "Tiền nhà" 3tr/tháng → bấm "Chạy ngay"
8. **Debts** → "Anh Nam" 1tr → trả 200k với ví Vietcombank

### Workflow C: Phân tích
9. **Templates** → "Cà phê" 25k → bấm Dùng 3 lần
10. **Reports** → range "30 ngày qua" → tải Excel
11. **Notifications** → kiểm tra cảnh báo (sẽ có nếu vượt budget)
12. **Settings** → upload avatar, đổi tên, switch dark mode

---

## 🐛 Troubleshooting nhanh

| Lỗi | Cách xử lý |
|---|---|
| Trắng màn hình | F12 → Console kiểm tra |
| Network Error | Backend chưa chạy hoặc CORS sai |
| 401 sau khi đăng nhập | LocalStorage bị bẩn → `localStorage.clear()` ở console |
| Toast không hiện | Đã có `<Toaster />` trong App.tsx — F12 xem |
| Recharts không render | Cần parent có chiều cao xác định |
| Dark mode flash | Đã xử lý ở `main.tsx` |
| Build size > 500KB warning | OK, vì có recharts + radix-ui (gzip < 500KB) |

> 📘 **Lỗi chi tiết:** xem `HUONG_DAN_CHAY.md` mục "Bảng tra cứu lỗi"

---

## 📦 Build production

```bash
npm run build
# output: dist/ (~1.6MB)

# test bản build
npm run preview
```

Deploy lên Vercel/Netlify: chỉ cần upload folder `dist/`. Backend deploy riêng.

---

## ✨ Tính năng nâng cao (chưa có, có thể thêm sau)

- Lazy loading routes (code-split để giảm bundle)
- PWA / Service worker (cache offline)
- Dark/light auto theo OS (`prefers-color-scheme`)
- i18n đa ngôn ngữ (chỉ tiếng Việt hiện tại)
- Drag & drop reorder template/category
- Quick add transaction qua keyboard shortcut
- Export PDF có biểu đồ (hiện chỉ text)
- Push notification (Web Push API)
