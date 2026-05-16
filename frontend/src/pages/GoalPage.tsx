import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Minus, Plus, Pencil, Trash2, Target, CheckCircle2, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { IconBubble } from "@/components/common/IconBubble";
import { goalService } from "@/services/moduleServices";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDate, toISODate } from "@/lib/utils";
import type { Goal } from "@/types";

const schema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0),
  targetDate: z.string().optional(),
  startDate: z.string(),
  icon: z.string(),
  color: z.string(),
});
type FormData = z.infer<typeof schema>;

const ICONS = ["target", "plane", "home", "car", "graduation-cap", "heart", "gift", "rocket"];
const COLORS = ["#3B82F6", "#10B981", "#F97316", "#EC4899", "#A855F7", "#0EA5E9", "#EF4444", "#FBBF24"];

export default function GoalPage() {
  const [items, setItems] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  // Modal "bo them tien"
  const [addingTo, setAddingTo] = useState<Goal | null>(null);
  const [addAmount, setAddAmount] = useState(0);
  const [adding, setAdding] = useState(false);
  const [withdrawingFrom, setWithdrawingFrom] = useState<Goal | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawing, setWithdrawing] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "",
      startDate: toISODate(new Date()),
      icon: "target",
      color: COLORS[0],
    },
  });

  const load = async () => {
    setLoading(true);
    try {
      setItems(await goalService.list());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openForm = (g: Goal | null) => {
    setEditing(g);
    if (g) {
      reset({
        name: g.name,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount),
        targetDate: g.targetDate || "",
        startDate: g.startDate,
        icon: g.icon,
        color: g.color,
      });
    } else {
      reset({
        name: "",
        targetAmount: 0,
        currentAmount: 0,
        targetDate: "",
        startDate: toISODate(new Date()),
        icon: "target",
        color: COLORS[0],
      });
    }
    setFormOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, targetDate: data.targetDate || null };
      if (editing) {
        await goalService.update(editing.id, payload);
        toast.success("Đã cập nhật");
      } else {
        await goalService.create(payload);
        toast.success("Đã tạo mục tiêu");
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
      await goalService.remove(deleting.id);
      toast.success("Đã xoá");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const handleAddToGoal = async () => {
    if (!addingTo || addAmount <= 0) return;
    setAdding(true);
    try {
      await goalService.addToGoal(addingTo.id, addAmount);
      toast.success("Đã bỏ thêm tiền vào mục tiêu");
      setAddingTo(null);
      setAddAmount(0);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const handleWithdrawFromGoal = async () => {
    if (!withdrawingFrom || withdrawAmount <= 0) return;
    if (withdrawAmount > Number(withdrawingFrom.currentAmount)) {
      toast.error("So tien rut vuot qua so tien hien co");
      return;
    }
    setWithdrawing(true);
    try {
      await goalService.withdrawFromGoal(withdrawingFrom.id, withdrawAmount);
      toast.success("Da rut tien khoi muc tieu");
      setWithdrawingFrom(null);
      setWithdrawAmount(0);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Mục tiêu tiết kiệm"
        description="Đặt mục tiêu và theo dõi tiến độ"
        action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Thêm mục tiêu</Button>}
      />

      {loading ? (
        <Card><CardContent className="p-8">Đang tải...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Chưa có mục tiêu"
          description="Đặt mục tiêu tiết kiệm cho chuyến du lịch, mua nhà..."
          action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Tạo mục tiêu</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((g) => {
            const progress = g.progress ?? 0;
            const isDone = g.status === "completed";
            return (
              <Card key={g.id} className={isDone ? "border-success/50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <IconBubble icon={g.icon} color={g.color} size="lg" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <span className="truncate">{g.name}</span>
                          {isDone && (
                            <Badge variant="success" className="gap-1 shrink-0">
                              <CheckCircle2 className="size-3" />
                              Hoàn thành
                            </Badge>
                          )}
                        </CardTitle>
                        {g.targetDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Hạn: {formatDate(g.targetDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon-sm" variant="ghost" onClick={() => openForm(g)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDeleting(g)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold">{formatCurrency(g.currentAmount)}</span>
                    <span className="text-sm text-muted-foreground">
                      / {formatCurrency(g.targetAmount)}
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    indicatorClassName={isDone ? "bg-success" : ""}
                  />
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-muted-foreground">{Math.round(progress)}%</span>
                    {g.daysLeft !== undefined && g.daysLeft !== null && !isDone && (
                      <span className="text-muted-foreground">
                        Còn {g.daysLeft} ngày
                        {g.suggestedDaily ? ` · ${formatCurrency(g.suggestedDaily)}/ngày` : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {!isDone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAddingTo(g); setAddAmount(0); }}
                      >
                        <WalletIcon className="size-4" />
                        Bỏ thêm tiền
                      </Button>
                    )}
                    {Number(g.currentAmount) > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setWithdrawingFrom(g); setWithdrawAmount(0); }}
                        className={isDone ? "sm:col-span-2" : ""}
                      >
                        <Minus className="size-4" />
                        Rút tiền
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form mục tiêu */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa mục tiêu" : "Tạo mục tiêu mới"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên</Label>
              <Input {...register("name")} placeholder="VD: Du lịch Đà Nẵng" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cần</Label>
                <Controller
                  control={control}
                  name="targetAmount"
                  render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} />}
                />
              </div>
              <div className="space-y-2">
                <Label>Đã có</Label>
                <Controller
                  control={control}
                  name="currentAmount"
                  render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} />}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Bắt đầu</Label>
                <Input type="date" {...register("startDate")} />
              </div>
              <div className="space-y-2">
                <Label>Hạn (tuỳ chọn)</Label>
                <Input type="date" {...register("targetDate")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Controller
                control={control}
                name="icon"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => field.onChange(ic)}
                        className={`p-2 rounded-lg border ${field.value === ic ? "border-primary bg-primary/10" : "border-border"}`}
                      >
                        <IconBubble icon={ic} color="#6B7280" size="sm" />
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Màu</Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => field.onChange(c)}
                        className={`size-8 rounded-full ${field.value === c ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Hủy</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? "Cập nhật" : "Tạo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bo them tien */}
      <Dialog open={!!addingTo} onOpenChange={(o) => !o && setAddingTo(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bỏ thêm tiền vào "{addingTo?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Số tiền</Label>
            <CurrencyInput value={addAmount} onChange={setAddAmount} className="text-xl h-12" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingTo(null)}>Hủy</Button>
            <Button onClick={handleAddToGoal} loading={adding} disabled={addAmount <= 0}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!withdrawingFrom} onOpenChange={(o) => !o && setWithdrawingFrom(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rut tien khoi "{withdrawingFrom?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Hien co: {formatCurrency(withdrawingFrom?.currentAmount || 0)}
            </div>
            <Label>So tien rut</Label>
            <CurrencyInput value={withdrawAmount} onChange={setWithdrawAmount} className="text-xl h-12" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawingFrom(null)}>Huy</Button>
            <Button
              onClick={handleWithdrawFromGoal}
              loading={withdrawing}
              disabled={withdrawAmount <= 0 || withdrawAmount > Number(withdrawingFrom?.currentAmount || 0)}
            >
              Xac nhan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Xóa mục tiêu?"
        description={`Bạn có chắc muốn xoá "${deleting?.name}"?`}
        loading={delLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
