import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconBubble } from "@/components/common/IconBubble";
import { EmptyState } from "@/components/common/EmptyState";
import { reportService } from "@/services/reportService";
import type { OverviewData, DailyStat, RangeReport } from "@/types";
import { formatCurrency, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/axios";
import { onTransactionsChanged } from "@/lib/realtime";
import { useAuthStore } from "@/stores/useAuthStore";

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [rangeReport, setRangeReport] = useState<RangeReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, ranges, range] = await Promise.all([
          reportService.overview(),
          reportService.presetRanges(),
          reportService.range(),
        ]);
        setOverview(ov);
        setRangeReport(range);
        const monthRange = ranges.thisMonth;
        const stats = await reportService.dailyStats(monthRange.from, monthRange.to);
        setDailyStats(stats.items || []);
      } catch (err) {
        toast.error(getErrorMessage(err, "Không tải được dữ liệu"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => onTransactionsChanged(() => {
    const refresh = async () => {
      try {
        const [ov, ranges, range] = await Promise.all([
          reportService.overview(),
          reportService.presetRanges(),
          reportService.range(),
        ]);
        setOverview(ov);
        setRangeReport(range);
        const monthRange = ranges.thisMonth;
        const stats = await reportService.dailyStats(monthRange.from, monthRange.to);
        setDailyStats(stats.items || []);
      } catch (err) {
        toast.error(getErrorMessage(err, "Không tải được dữ liệu mới"));
      }
    };

    void refresh();
  }), []);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-28 p-6" />
          </Card>
        ))}
      </div>
    );
  }

  if (!overview) return null;

  const expenseCats = (rangeReport?.byCategory || [])
    .filter((c) => c.type === "expense")
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {user?.displayName?.split(" ").pop()} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Đây là tình hình tài chính của bạn hôm nay
          </p>
        </div>
        <Button onClick={() => navigate("/transactions?new=1")}>
          <Plus className="size-4" />
          Thêm giao dịch
        </Button>
      </div>

      {/* Cards thống kê */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="size-5" />}
          label="Tổng số dư"
          value={formatCurrency(overview.totalBalance)}
          color="primary"
        />
        <StatCard
          icon={<TrendingUp className="size-5" />}
          label="Thu tháng này"
          value={formatCurrency(overview.monthIncome)}
          color="success"
        />
        <StatCard
          icon={<TrendingDown className="size-5" />}
          label="Chi tháng này"
          value={formatCurrency(overview.monthExpense)}
          color="destructive"
        />
        <StatCard
          icon={<PiggyBank className="size-5" />}
          label="Còn lại tháng"
          value={formatCurrency(overview.monthNet)}
          subValue={`Tỉ lệ tiết kiệm ${overview.savingRate}%`}
          color={overview.monthNet >= 0 ? "success" : "destructive"}
        />
      </div>

      {/* Today summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Biến động trong tháng</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyStats.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="incomeG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(8, 10)}
                    fontSize={12}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : v >= 1000 ? `${v / 1000}k` : v)}
                    fontSize={12}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Ngày ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Thu"
                    stroke="hsl(var(--success))"
                    fill="url(#incomeG)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Chi"
                    stroke="hsl(var(--destructive))"
                    fill="url(#expenseG)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cơ cấu chi tiêu</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCats.length === 0 ? (
              <EmptyState title="Chưa có chi tiêu" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={expenseCats}
                    dataKey="total"
                    nameKey={(d) => d.category?.name || "Khác"}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {expenseCats.map((c, i) => (
                      <Cell key={i} fill={c.category?.color || "#6B7280"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(v) => <span className="text-foreground">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Giao dịch gần đây</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")}>
            Xem tất cả
          </Button>
        </CardHeader>
        <CardContent>
          {overview.recentTransactions.length === 0 ? (
            <EmptyState
              title="Chưa có giao dịch"
              description="Hãy thêm giao dịch đầu tiên để theo dõi tài chính"
              action={
                <Button onClick={() => navigate("/transactions?new=1")}>
                  <Plus className="size-4" /> Thêm giao dịch
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {overview.recentTransactions.map((tx) => (
                <li key={tx.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <IconBubble icon={tx.Category?.icon} color={tx.Category?.color} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tx.description || tx.Category?.name || "(không mô tả)"}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.Wallet?.name} · {formatRelative(tx.transactionDate)}
                    </p>
                  </div>
                  <div className={`text-right font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                    <span className="flex items-center gap-1">
                      {tx.type === "income" ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownRight className="size-4" />
                      )}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: "primary" | "success" | "destructive";
}

function StatCard({ icon, label, value, subValue, color }: StatCardProps) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`flex size-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold mt-2 truncate">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
      </CardContent>
    </Card>
  );
}
