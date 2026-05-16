# Money Manager Frontend

Frontend React/Vite cho ứng dụng quản lý chi tiêu cá nhân.

## Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- React Hook Form, Zod
- Zustand

## Cài đặt

```bash
npm install
copy .env.example .env
npm run dev
```

Trên macOS/Linux dùng `cp .env.example .env`.

## Biến môi trường

```env
VITE_API_URL=http://localhost:5001/api
VITE_BACKEND_URL=http://localhost:5001
```

Khi deploy, đổi các URL này sang domain backend thật.

## AI Tài chính

Trang `/ai` là giao diện chatbot Gemini. Frontend không chứa API key; mọi request AI đi qua backend `/api/ai`.

## Scripts

- `npm run dev`: chạy dev server
- `npm run lint`: kiểm tra lint
- `npm run build`: build production
- `npm run preview`: preview bản build
