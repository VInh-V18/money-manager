import api from "@/lib/axios";
import type { ForecastData, MonthlyComparison, OverviewData, RangeReport, DailyStat, WeeklyStat } from "@/types";

const asDailyStats = (value: unknown): DailyStat[] =>
  Array.isArray(value) ? (value as DailyStat[]) : [];

const asWeeklyStats = (value: unknown): WeeklyStat[] =>
  Array.isArray(value) ? (value as WeeklyStat[]) : [];

export const reportService = {
  overview: () =>
    api.get("/reports/overview").then((r) => r.data.data as OverviewData),

  range: (fromDate?: string, toDate?: string) =>
    api
      .get("/reports/range", { params: { fromDate, toDate } })
      .then((r) => r.data.data as RangeReport),

  dailyStats: (fromDate: string, toDate: string) =>
    api
      .get("/reports/daily-stats", { params: { fromDate, toDate } })
      .then((r) => {
        const data = r.data?.data;
        return {
          items: asDailyStats(data?.items),
          range: data?.range || { from: fromDate, to: toDate },
        };
      }),

  weeklyStats: (fromDate: string, toDate: string) =>
    api
      .get("/reports/weekly-stats", { params: { fromDate, toDate } })
      .then((r) => {
        const data = r.data?.data;
        return {
          items: asWeeklyStats(data?.items),
          range: data?.range || { from: fromDate, to: toDate },
        };
      }),

  compareMonths: () =>
    api.get("/reports/compare-months").then((r) => r.data.data as MonthlyComparison),

  forecast: () => api.get("/reports/forecast").then((r) => r.data.data as ForecastData),

  presetRanges: () => api.get("/reports/preset-ranges").then((r) => r.data.data),

  exportExcel: (fromDate?: string, toDate?: string) =>
    api.get("/reports/export/excel", {
      params: { fromDate, toDate },
      responseType: "blob",
    }),

  exportCsv: (fromDate?: string, toDate?: string) =>
    api.get("/reports/export/csv", {
      params: { fromDate, toDate },
      responseType: "blob",
    }),

  exportPdf: (fromDate?: string, toDate?: string) =>
    api.get("/reports/export/pdf", {
      params: { fromDate, toDate },
      responseType: "blob",
    }),

  exportBackupJson: () =>
    api.get("/reports/export/backup-json", {
      responseType: "blob",
    }),

  restoreBackupJson: (file: File) => {
    const fd = new FormData();
    fd.append("backup", file);
    return api
      .post("/reports/import/backup-json", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data as Record<string, number>);
  },

  importTransactionsCsv: (file: File) => {
    const fd = new FormData();
    fd.append("csv", file);
    return api
      .post("/reports/import/transactions-csv", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data as { imported: number; failed: number; errors: Array<{ line: number; reason: string }> });
  },
};

/** Helper download blob xuống file */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
