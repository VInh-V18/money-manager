import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Repeat, PlayCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { fixedExpenseService } from "@/services/moduleServices";
import { walletService, categoryService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDate, toISODate } from "@/lib/utils";
import type { FixedExpense, Wallet, Category, BudgetPeriod } from "@/types";

const schema = z.object({
  walletId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  startDate: z.string(),
  remindDaysBefore: z.number().int().min(0).max(30),
  autoDeduct: z.boolean(),
  note: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const FREQ_LABELS: Record<BudgetPeriod, string> = {
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
  yearly: "Hàng năm",
  custom: "Tùy chỉnh",
};

export default function FixedExpensePage() {
  const [items, setItems] = useState<FixedExpense[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const [deleting, setDeleting] = useState<FixedExpense | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      walletId: 0,
      categoryId: null,
      name: "",
      amount: 0,
      frequency: "monthly",
      dayOfMonth: 1,
      dayOfWeek: null,
      startDate: toISODate(new Date()),
      remindDaysBefore: 2,
      autoDeduct: true,
      note: "",
    },
  });

  const freq = watch("frequency");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fixedExpenseService.list();
      setItems(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    Promise.all([walletService.list(), categoryService.list("expense")])
      .then(([w, c]) => { setWallets(w.wallets); setCategories(c); })
      .catch(() => {});
  }, []);

  const openForm = (e: FixedExpense | null) => {
    setEditing(e);
    if (e) {
      reset({
        walletId: e.walletId,
        categoryId: e.categoryId,
        name: e.name,
        amount: Number(e.amount),
        frequency: e.frequency,
        dayOfMonth: e.dayOfMonth,
        dayOfWeek: e.dayOfWeek,
        startDate: e.startDate,
        remindDaysBefore: e.remindDaysBefore,
        autoDeduct: e.autoDeduct,
        note: e.note || "",
      });
    } else {
      reset({
        walletId: wallets[0]?.id || 0,
        categoryId: null,
        name: "",
        amount: 0,
        frequency: "monthly",
        dayOfMonth: 1,
        dayOfWeek: null,
        startDate: toISODate(new Date()),
        remindDaysBefore: 2,
        autoDeduct: true,
        note: "",
      });
    }
    setFormOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, categoryId: data.categoryId || null };
      if (editing) {
        await fixedExpenseService.update(editing.id, payload);
        toast.success("Đã cập nhật");
      } else {
        await fixedExpenseService.create(payload);
        toast.success("Đã tạo");
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
      await fixedExpenseService.remove(deleting.id);
      toast.success("Đã xoá");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const runGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fixedExpenseService.generateDue();
      toast.success(`Đã sinh ${res.generated || 0} giao dịch, ${res.warned || 0} cảnh báo`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Chi cố định"
        description="Hóa đơn định kỳ tự sinh giao dịch khi đến hạn"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={runGenerate} loading={generating}>
              <PlayCircle className="size-4" />
              Chạy ngay
            </Button>
            <Button onClick={() => openForm(null)}>
              <Plus className="size-4" /> Thêm
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card><CardContent className="p-8">Đang tải...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Chưa có chi cố định"
          description="Đăng ký Netflix, tiền nhà, internet... sẽ tự trừ ví khi đến hạn"
          action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Thêm</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{e.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary">{FREQ_LABELS[e.frequency]}</Badge>
                      {e.autoDeduct && <Badge variant="success">Tự trừ ví</Badge>}
                      {!e.isActive && <Badge variant="outline">Tạm dừng</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => openForm(e)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDeleting(e)}
                      className="text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-2xl font-bold text-expense">{formatCurrency(e.amount)}</p>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    Lần tới: <span className="font-medium text-foreground">{formatDate(e.nextDueDate)}</span>
                  </p>
                  {e.Wallet && <p>Ví: {e.Wallet.name}</p>}
                  {e.Category && <p>Danh mục: {e.Category.name}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa chi cố định" : "Thêm chi cố định"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên</Label>
              <Input {...register("name")} placeholder="VD: Tiền nhà, Netflix..." />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Số tiền</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ví</Label>
                <Controller
                  control={control}
                  name="walletId"
                  render={({ field }) => (
                    <Select value={String(field.value || "")} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Chọn ví" /></SelectTrigger>
                      <SelectContent>
                        {wallets.map((w) => (
                          <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                    >
                      <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tần suất</Label>
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FREQ_LABELS).map(([k, v]) => (
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

            {freq === "monthly" && (
              <div className="space-y-2">
                <Label>Ngày trong tháng (1-31)</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  {...register("dayOfMonth", { valueAsNumber: true })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Nhắc trước (ngày)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                {...register("remindDaysBefore", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea {...register("note")} rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Hủy</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? "Cập nhật" : "Tạo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Xóa chi cố định?"
        loading={delLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
