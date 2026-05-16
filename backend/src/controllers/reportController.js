import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { badRequest } from "../utils/errors.js";
import {
  getOverview,
  getReportByRange,
  getDailyStats,
  getWeeklyStats,
  getMonthlyComparison,
  getForecast,
} from "../services/reportService.js";
import {
  exportTransactionsToExcel,
  exportTransactionsToCsv,
  exportReportToPDF,
  exportUserBackupJson,
  restoreUserBackupJson,
  importTransactionsFromCsv,
} from "../services/exportService.js";
import {
  formatDate,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  startOfYear,
  addDays,
  today,
} from "../utils/date.js";

// helper: lay range tu query, mac dinh la thang nay
const resolveRange = (req) => {
  let from = req.query.fromDate;
  let to = req.query.toDate;
  if (!from || !to) {
    from = formatDate(startOfMonth());
    to = formatDate(endOfMonth());
  }
  return { from, to };
};

export const overview = asyncHandler(async (req, res) => {
  const data = await getOverview(req.user.id);
  return ok(res, data);
});

export const rangeReport = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req);
  const data = await getReportByRange(req.user.id, from, to, req.query);
  return ok(res, data);
});

export const dailyStats = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req);
  const items = await getDailyStats(req.user.id, from, to, req.query);
  return ok(res, { items, range: { from, to } });
});

export const weeklyStats = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req);
  const items = await getWeeklyStats(req.user.id, from, to, req.query);
  return ok(res, { items, range: { from, to } });
});

export const compareMonths = asyncHandler(async (req, res) => {
  const data = await getMonthlyComparison(req.user.id);
  return ok(res, data);
});

export const forecast = asyncHandler(async (req, res) => {
  const data = await getForecast(req.user.id);
  return ok(res, data);
});

// === Export Excel ===
export const exportExcel = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req);
  const buffer = await exportTransactionsToExcel(req.user.id, from, to);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="bao-cao-${from}_${to}.xlsx"`
  );
  res.send(Buffer.from(buffer));
});

// === Export CSV ===
export const exportCsv = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req);
  const csv = await exportTransactionsToCsv(req.user.id, from, to);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="giao-dich-${from}_${to}.csv"`
  );
  res.send(`\uFEFF${csv}`);
});

// === Export PDF ===
export const exportPdf = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req);
  const buffer = await exportReportToPDF(req.user.id, from, to);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="bao-cao-${from}_${to}.pdf"`
  );
  res.send(buffer);
});

// === Backup JSON ===
export const exportBackupJson = asyncHandler(async (req, res) => {
  const backup = await exportUserBackupJson(req.user);
  const today = formatDate(new Date());
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="money-manager-backup-${today}.json"`
  );
  res.send(JSON.stringify(backup, null, 2));
});

// === Restore JSON backup ===
export const restoreBackupJson = asyncHandler(async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ success: false, message: "Vui long chon file backup JSON" });
  }
  const text = req.file.buffer.toString("utf8");
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw badRequest("File JSON khong hop le");
  }
  const result = await restoreUserBackupJson(req.user.id, backup);
  return ok(res, result, "Restore backup thanh cong");
});

// === Import transaction CSV ===
export const importTransactionsCsv = asyncHandler(async (req, res) => {
  if (!req.file?.buffer) {
    throw badRequest("Vui long chon file CSV");
  }
  const result = await importTransactionsFromCsv(req.user.id, req.file.buffer.toString("utf8"));
  return ok(res, result, `Da import ${result.imported} giao dich`);
});

// === Helper preset ranges (cho quick filter) ===
export const presetRanges = asyncHandler(async (req, res) => {
  const t = today();
  return ok(res, {
    today: { from: formatDate(t), to: formatDate(t) },
    yesterday: {
      from: formatDate(addDays(t, -1)),
      to: formatDate(addDays(t, -1)),
    },
    thisWeek: {
      from: formatDate(startOfWeek()),
      to: formatDate(addDays(startOfWeek(), 6)),
    },
    thisMonth: {
      from: formatDate(startOfMonth()),
      to: formatDate(endOfMonth()),
    },
    lastMonth: (() => {
      const lm = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      return {
        from: formatDate(startOfMonth(lm)),
        to: formatDate(endOfMonth(lm)),
      };
    })(),
    thisYear: {
      from: formatDate(startOfYear()),
      to: `${t.getFullYear()}-12-31`,
    },
    last30Days: {
      from: formatDate(addDays(t, -29)),
      to: formatDate(t),
    },
  });
});
