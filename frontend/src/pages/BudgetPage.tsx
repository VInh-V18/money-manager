import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, AlertTriangle, PiggyBank, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { budgetService } from "@/services/moduleServices";
import { categoryService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, toISODate, formatDate } from "@/lib/utils";
import type { Budget, BudgetSummary, Category, BudgetPeriod } from "@/types";

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.number().int().positive().nullable().optional(),
  amount: z.number().positive(),
  period: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  startDate: z.string(),
  warnThreshold: z.number().min(0).max(100),
  strictMode: z.boolean(),
});
type FormData = z.infer<typeof schema>;
type BudgetListResponse = {
  items?: Budget[];
  budgets?: Budget[];
  data?: Budget[];
};
type BudgetSuggestion = Awaited<ReturnType<typeof budgetService.suggestions>>["items"][number];

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
  yearly: "Hàng năm",
  custom: "Tuỳ chỉnh",
};

export default function BudgetPage() {
  const [items, setItems] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      categoryId: null,
      amount: 0,
      period: "monthly",
      startDate: toISODate(new Date()),
      warnThreshold: 80,
      strictMode: false,
    },
  });

  const load = async () => {
  setLoading(true);
  try {
    const [data, sum] = await Promise.all([
      budgetService.list(),
      budgetService.summary(),
    ]);

    const budgetData = data as Budget[] | BudgetListResponse;
    if (Array.isArray(budgetData)) {
      setItems(data);
    } else if (Array.isArray(budgetData.items)) {
      setItems(budgetData.items);
    } else if (Array.isArray(budgetData.budgets)) {
      setItems(budgetData.budgets);
    } else if (Array.isArray(budgetData.data)) {
      setItems(budgetData.data);
    } else {
      setItems([]);
    }

    setSummary(sum || null);
  } catch (err) {
    setItems([]);
    setSummary(null);
    toast.error(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    load();
    categoryService.list("expense").then(setCategories).catch(() => {});
  }, []);

  const openForm = (b: Budget | null) => {
    setEditing(b);
    if (b) {
      reset({
        name: b.name,
        categoryId: b.categoryId,
        amount: Number(b.amount),
        period: b.period,
        startDate: b.startDate,
        warnThreshold: b.warnThreshold,
        strictMode: b.strictMode,
      });
    } else {
      reset({
        name: "",
        categoryId: null,
        amount: 0,
        period: "monthly",
        startDate: toISODate(new Date()),
        warnThreshold: 80,
        strictMode: false,
      });
    }
    setFormOpen(true);
  };

  const openSuggestion = (item: BudgetSuggestion) => {
    setEditing(null);
    reset({
      name: item.category ? `Ngân sách ${item.category.name}` : "Ngân sách đề xuất",
      categoryId: item.categoryId,
      amount: Number(item.suggestedAmount),
      period: "monthly",
      startDate: toISODate(new Date()),
      warnThreshold: 80,
      strictMode: false,
    });
    setFormOpen(true);
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const data = await budgetService.suggestions();
      setSuggestions(data.items);
      if (data.items.length === 0) toast.info("Chưa đủ dữ liệu chi tiêu tháng trước để gợi ý");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, categoryId: data.categoryId || null };
      if (editing) {
        await budgetService.update(editing.id, payload);
        toast.success("Đã cập nhật ngân sách");
      } else {
        await budgetService.create(payload);
        toast.success("Đã tạo ngân sách");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await budgetService.remove(deleting.id);
      toast.success("Đã xoá");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ngân sách"
        description="Đặt mức chi tối đa và theo dõi tiến độ"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadSuggestions} loading={suggestionsLoading}>
              <Sparkles className="size-4" /> Gợi ý
            </Button>
            <Button onClick={() => openForm(null)}>
              <Plus className="size-4" /> Thêm ngân sách
            </Button>
          </div>
        }
      />

      {suggestions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gợi ý ngân sách tháng sau</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {suggestions.map((item) => (
              <div key={item.categoryId} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.category?.name || "Danh mục"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tháng trước chi {formatCurrency(item.spent)} trong {item.count} giao dịch.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openSuggestion(item)}>
                    {formatCurrency(item.suggestedAmount)}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary card */}
      {summary && summary.count > 0 && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Tổng giới hạn</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalLimit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Đã chi</p>
              <p className="text-2xl font-bold mt-1 text-expense">{formatCurrency(summary.totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Còn lại</p>
              <p className={`text-2xl font-bold mt-1 ${summary.totalRemaining >= 0 ? "text-income" : "text-expense"}`}>
                {formatCurrency(summary.totalRemaining)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <Card><CardContent className="p-8">Đang tải...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Chưa có ngân sách"
          description="Đặt giới hạn chi tiêu để kiểm soát tài chính tốt hơn"
          action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Tạo ngân sách</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((b) => (
            <Card key={b.id} className={b.isExceeded ? "border-destructive/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2">
                      {b.name}
                      {b.isExceeded && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Vượt
                        </Badge>
                      )}
                      {b.isWarning && !b.isExceeded && (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Cảnh báo
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {PERIOD_LABELS[b.period]}
                      {b.Category && ` · ${b.Category.name}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon-sm" variant="ghost" onClick={() => openForm(b)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDeleting(b)}
                      className="text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold">{formatCurrency(b.spent || 0)}</span>
                  <span className="text-sm text-muted-foreground">
                    / {formatCurrency(b.limit || b.amount)}
                  </span>
                </div>
                <Progress
                  value={b.usedPercent || 0}
                  indicatorClassName={
                    b.isExceeded
                      ? "bg-destructive"
                      : b.isWarning
                        ? "bg-warning"
                        : "bg-primary"
                  }
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{Math.round(b.usedPercent || 0)}% đã dùng</span>
                  <span>
                    {b.remaining !== undefined && b.remaining < 0
                      ? `Vượt ${formatCurrency(Math.abs(b.remaining))}`
                      : `Còn ${formatCurrency(b.remaining || 0)}`}
                  </span>
                </div>
                {b.periodFrom && b.periodTo && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Kỳ: {formatDate(b.periodFrom)} – {formatDate(b.periodTo)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa ngân sách" : "Tạo ngân sách"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên</Label>
              <Input {...register("name")} placeholder="VD: Ăn uống tháng 5" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Số tiền giới hạn</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={field.onChange} placeholder="0" />
                )}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Chu kỳ</Label>
                <Controller
                  control={control}
                  name="period"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Bắt đầu</Label>
                <Input type="date" {...register("startDate")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Danh mục (tuỳ chọn)</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : "all"}
                    onValueChange={(v) => field.onChange(v === "all" ? null : Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Cảnh báo khi đạt (%)</Label>
              <Input type="number" min={0} max={100} {...register("warnThreshold", { valueAsNumber: true })} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Huỷ</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? "Cập nhật" : "Tạo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Xoá ngân sách?"
        description={`Bạn có chắc muốn xoá "${deleting?.name}"?`}
        loading={delLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
