import { useEffect, useRef, useState, useCallback } from "react";
import { DatabaseBackup, FileDown, FileSpreadsheet, FileText, FileUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { reportService, downloadBlob } from "@/services/reportService";
import { getErrorMessage } from "@/lib/axios";
import { onTransactionsChanged } from "@/lib/realtime";
import { formatCurrency, toISODate } from "@/lib/utils";
import type { ForecastData, MonthlyComparison, RangeReport, DailyStat, WeeklyStat } from "@/types";

const PRESETS = [
  { label: "Hôm nay", days: 0 },
  { label: "7 ngày qua", days: 6 },
  { label: "30 ngày qua", days: 29 },
  { label: "Tháng này", monthly: true },
];

const healthMeta = {
  good: { label: "Tốt", color: "bg-success", text: "text-success" },
  fair: { label: "Ổn", color: "bg-primary", text: "text-primary" },
  watch: { label: "Cần chú ý", color: "bg-warning", text: "text-warning" },
  risk: { label: "Rủi ro", color: "bg-destructive", text: "text-destructive" },
} as const;

export default function ReportPage() {
  const [range, setRange] = useState({
    from: toISODate(new Date(new Date().setDate(new Date().getDate() - 29))),
    to: toISODate(new Date()),
  });
  const [report, setReport] = useState<RangeReport | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [comparison, setComparison] = useState<MonthlyComparison | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "csv" | "pdf" | "backup" | "restore" | "csv-import" | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [r, d, w, c, f] = await Promise.all([
        reportService.range(range.from, range.to),
        reportService.dailyStats(range.from, range.to),
        reportService.weeklyStats(range.from, range.to),
        reportService.compareMonths(),
        reportService.forecast(),
      ]);
      setReport(r);
      setDailyStats(d.items);
      setWeeklyStats(w.items);
      setComparison(c);
      setForecast(f);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => onTransactionsChanged(() => {
    void load({ silent: true });
  }), [load]);

  const setPreset = (p: typeof PRESETS[number]) => {
    const today = new Date();
    if (p.monthly) {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setRange({ from: toISODate(first), to: toISODate(last) });
    } else if (typeof p.days === "number") {
      const start = new Date();
      start.setDate(start.getDate() - p.days);
      setRange({ from: toISODate(start), to: toISODate(today) });
    }
  };

  const handleExport = async (kind: "excel" | "csv" | "pdf") => {
    setExporting(kind);
    try {
      const fn =
        kind === "excel"
          ? reportService.exportExcel
          : kind === "csv"
            ? reportService.exportCsv
            : reportService.exportPdf;
      const ext = kind === "excel" ? "xlsx" : kind;
      const res = await fn(range.from, range.to);
      downloadBlob(new Blob([res.data]), `bao-cao-${range.from}_${range.to}.${ext}`);
      toast.success(`Đã tải ${kind.toUpperCase()}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  const handleBackup = async () => {
    setExporting("backup");
    try {
      const res = await reportService.exportBackupJson();
      downloadBlob(new Blob([res.data], { type: "application/json" }), `money-manager-backup-${toISODate(new Date())}.json`);
      toast.success("Đã tải backup JSON");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  const handleRestoreFile = async (file?: File) => {
    if (!file) return;
    if (!window.confirm("Restore sẽ nhập thêm dữ liệu từ file backup vào tài khoản hiện tại. Tiếp tục?")) {
      return;
    }
    setExporting("restore");
    try {
      const result = await reportService.restoreBackupJson(file);
      toast.success(
        `Đã restore: ${result.wallets || 0} ví, ${result.categories || 0} danh mục, ${result.transactions || 0} giao dịch`
      );
      void load({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(null);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  };

  const handleCsvFile = async (file?: File) => {
    if (!file) return;
    setExporting("csv-import");
    try {
      const result = await reportService.importTransactionsCsv(file);
      toast.success(`Đã import ${result.imported} giao dịch, lỗi ${result.failed}`);
      void load({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // top 8 expense categories cho pie
  const expensePie = (report?.byCategory || [])
    .filter((c) => c.type === "expense")
    .slice(0, 8);

  const incomePie = (report?.byCategory || [])
    .filter((c) => c.type === "income")
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Báo cáo"
        description="Phân tích thu chi và xuất Excel/PDF"
      />

      {/* Range picker + presets */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
            <div className="space-y-2">
              <Label>Từ ngày</Label>
              <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Đến ngày</Label>
              <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleExport("excel")} loading={exporting === "excel"}>
                <FileSpreadsheet className="size-4" /> Excel
              </Button>
              <Button variant="outline" onClick={() => handleExport("csv")} loading={exporting === "csv"}>
                <FileDown className="size-4" /> CSV
              </Button>
              <Button variant="outline" onClick={() => csvInputRef.current?.click()} loading={exporting === "csv-import"}>
                <FileUp className="size-4" /> Import CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport("pdf")} loading={exporting === "pdf"}>
                <FileText className="size-4" /> PDF
              </Button>
              <Button variant="outline" onClick={handleBackup} loading={exporting === "backup"}>
                <DatabaseBackup className="size-4" /> Backup
              </Button>
              <Button variant="outline" onClick={() => restoreInputRef.current?.click()} loading={exporting === "restore"}>
                <FileUp className="size-4" /> Restore
              </Button>
              <input
                ref={csvInputRef}
                type="file"
                accept="text/csv,.csv"
                className="hidden"
                onChange={(event) => void handleCsvFile(event.target.files?.[0])}
              />
              <input
                ref={restoreInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => void handleRestoreFile(event.target.files?.[0])}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {PRESETS.map((p) => (
              <Button key={p.label} size="sm" variant="ghost" onClick={() => setPreset(p)}>
                {p.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading || !report ? (
        <Card><CardContent className="p-8">Đang tải báo cáo...</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Thu nhập</p>
                <p className="text-2xl font-bold mt-1 text-income">{formatCurrency(report.summary.income)}</p>
                <p className="text-xs text-muted-foreground mt-1">{report.summary.incomeCount} giao dịch</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Chi tiêu</p>
                <p className="text-2xl font-bold mt-1 text-expense">{formatCurrency(report.summary.expense)}</p>
                <p className="text-xs text-muted-foreground mt-1">{report.summary.expenseCount} giao dịch</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Còn lại</p>
                <p className={`text-2xl font-bold mt-1 ${report.summary.net >= 0 ? "text-income" : "text-expense"}`}>
                  {formatCurrency(report.summary.net)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tỉ lệ tiết kiệm: {report.summary.savingRate}%
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sức khỏe tài chính</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={`text-4xl font-bold ${healthMeta[report.financialHealth.level].text}`}>
                    {report.financialHealth.score}/100
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Trạng thái: {healthMeta[report.financialHealth.level].label}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">Vượt ngân sách</p>
                    <p className="font-semibold">{report.financialHealth.exceededBudgets}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nợ quá hạn</p>
                    <p className="font-semibold">{report.financialHealth.overdueDebts}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ví thấp</p>
                    <p className="font-semibold">{report.financialHealth.lowWallets}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ví âm</p>
                    <p className="font-semibold">{report.financialHealth.negativeWallets}</p>
                  </div>
                </div>
              </div>
              <Progress value={report.financialHealth.score} indicatorClassName={healthMeta[report.financialHealth.level].color} />
              {report.financialHealth.suggestions.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {report.financialHealth.suggestions.map((item) => (
                    <div key={item} className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không có cảnh báo lớn trong kỳ báo cáo này.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {comparison && (
              <Card>
                <CardHeader>
                  <CardTitle>So sanh thang nay</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Thu nhap thang nay</p>
                      <p className="mt-1 text-xl font-semibold text-income">{formatCurrency(comparison.current.income)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {comparison.change.income >= 0 ? "+" : ""}{comparison.change.income}% so voi thang truoc
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Chi tieu thang nay</p>
                      <p className="mt-1 text-xl font-semibold text-expense">{formatCurrency(comparison.current.expense)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {comparison.change.expense >= 0 ? "+" : ""}{comparison.change.expense}% so voi thang truoc
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <p className="text-muted-foreground">Thang truoc thu</p>
                      <p className="font-semibold">{formatCurrency(comparison.previous.income)}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <p className="text-muted-foreground">Thang truoc chi</p>
                      <p className="font-semibold">{formatCurrency(comparison.previous.expense)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {forecast && (
              <Card>
                <CardHeader>
                  <CardTitle>Du bao cuoi thang</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Chi trung binh/ngay</p>
                      <p className="mt-1 text-xl font-semibold">{formatCurrency(forecast.avgDailyExpense)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Du bao chi ca thang</p>
                      <p className="mt-1 text-xl font-semibold text-expense">{formatCurrency(forecast.projectedMonthExpense)}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <p className="text-muted-foreground">Du kien con lai cuoi thang</p>
                    <p className={`text-lg font-semibold ${forecast.projectedRemainingByMonthEnd >= 0 ? "text-income" : "text-expense"}`}>
                      {formatCurrency(forecast.projectedRemainingByMonthEnd)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Da qua {forecast.daysPassed} ngay, con {forecast.daysLeft} ngay trong thang.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Daily bar chart */}
          <Card>
            <CardHeader>
              <CardTitle>Biến động theo ngày</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyStats.length === 0 ? (
                <EmptyState title="Chưa có dữ liệu" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                    <YAxis
                      tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : v >= 1000 ? `${v / 1000}k` : v)}
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Thu" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Chi" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dòng tiền theo tuần</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyStats.length === 0 ? (
                <EmptyState title="Chưa có dữ liệu tuần" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="weekStart" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                    <YAxis
                      tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : v >= 1000 ? `${v / 1000}k` : v)}
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                      }}
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload as WeeklyStat | undefined;
                        return item ? `${item.weekStart} - ${item.weekEnd}` : "";
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Thu" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Chi" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" name="Còn lại" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Cơ cấu chi tiêu</CardTitle></CardHeader>
              <CardContent>
                {expensePie.length === 0 ? (
                  <EmptyState title="Chưa có chi tiêu" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={expensePie}
                        dataKey="total"
                        nameKey={(d) => d.category?.name || "Khác"}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                      >
                        {expensePie.map((c, i) => (
                          <Cell key={i} fill={c.category?.color || "#6B7280"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Cơ cấu thu nhập</CardTitle></CardHeader>
              <CardContent>
                {incomePie.length === 0 ? (
                  <EmptyState title="Chưa có thu nhập" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={incomePie}
                        dataKey="total"
                        nameKey={(d) => d.category?.name || "Khác"}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                      >
                        {incomePie.map((c, i) => (
                          <Cell key={i} fill={c.category?.color || "#10B981"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top transactions */}
          {report.topTransactions && report.topTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Giao dịch lớn nhất</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {report.topTransactions.map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{tx.description || tx.Category?.name || "(không mô tả)"}</p>
                        <p className="text-xs text-muted-foreground">{tx.transactionDate}</p>
                      </div>
                      <p className={`font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                        {formatCurrency(tx.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
