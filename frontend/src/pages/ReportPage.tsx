import { useEffect, useState, useCallback } from "react";
import { Download, FileSpreadsheet, FileText, BarChart3 } from "lucide-react";
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
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { reportService, downloadBlob } from "@/services/reportService";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, toISODate } from "@/lib/utils";
import type { RangeReport, DailyStat } from "@/types";

const PRESETS = [
  { label: "Hôm nay", days: 0 },
  { label: "7 ngày qua", days: 6 },
  { label: "30 ngày qua", days: 29 },
  { label: "Tháng này", monthly: true },
];

export default function ReportPage() {
  const [range, setRange] = useState({
    from: toISODate(new Date(new Date().setDate(new Date().getDate() - 29))),
    to: toISODate(new Date()),
  });
  const [report, setReport] = useState<RangeReport | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        reportService.range(range.from, range.to),
        reportService.dailyStats(range.from, range.to),
      ]);
      setReport(r);
      setDailyStats(d.items);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

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

  const handleExport = async (kind: "excel" | "pdf") => {
    setExporting(kind);
    try {
      const fn = kind === "excel" ? reportService.exportExcel : reportService.exportPdf;
      const ext = kind === "excel" ? "xlsx" : "pdf";
      const res = await fn(range.from, range.to);
      downloadBlob(new Blob([res.data]), `bao-cao-${range.from}_${range.to}.${ext}`);
      toast.success(`Đã tải ${kind === "excel" ? "Excel" : "PDF"}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(null);
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport("excel")} loading={exporting === "excel"}>
                <FileSpreadsheet className="size-4" /> Excel
              </Button>
              <Button variant="outline" onClick={() => handleExport("pdf")} loading={exporting === "pdf"}>
                <FileText className="size-4" /> PDF
              </Button>
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
