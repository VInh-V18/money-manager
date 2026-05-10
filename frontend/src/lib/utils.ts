import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format số tiền VND */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "VND"
): string {
  const n = Number(amount || 0);
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
  }
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(n);
}

/** Format số tiền ngắn gọn cho card thống kê: 1.5tr, 250k */
export function formatCompact(amount: number | string | null | undefined): string {
  const n = Number(amount || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}t`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}tr`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${Math.round(abs)}`;
}

/** Format ngày dd/MM/yyyy */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("vi-VN");
}

/** Format ngày + giờ */
export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Định dạng "hôm nay / hôm qua / 3 ngày trước" */
export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  if (diff > 1 && diff < 7) return `${diff} ngày trước`;
  return formatDate(d);
}

/** Convert "2026-05-10" -> Date local */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Convert Date -> "YYYY-MM-DD" */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
