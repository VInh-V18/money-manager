import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: "Money Manager",
        short_name: "Money",
        description: "Quản lý thu chi cá nhân, ví tiền, ngân sách và báo cáo tài chính.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        orientation: "portrait-primary",
        lang: "vi",
        categories: ["finance", "productivity"],
        icons: [
          {
            src: "/app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached lâu dài, ít thay đổi
          "vendor-react": ["react", "react-dom", "react-router"],
          // Biểu đồ nặng — chỉ load khi vào trang Reports
          "vendor-charts": ["recharts"],
          // Markdown renderer — chỉ dùng ở AI page
          "vendor-markdown": ["react-markdown"],
          // Radix UI primitives
          "vendor-radix": [
            "@radix-ui/react-avatar",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-tabs",
          ],
          // Utilities nhỏ — bundle cùng nhau
          "vendor-utils": ["axios", "zustand", "zod", "date-fns", "sonner", "clsx", "tailwind-merge", "class-variance-authority"],
        },
      },
    },
    // Cảnh báo nếu chunk > 400KB sau khi split
    chunkSizeWarningLimit: 400,
  },
});
