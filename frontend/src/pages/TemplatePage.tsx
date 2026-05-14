import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Zap, Pin } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { IconBubble } from "@/components/common/IconBubble";
import { templateService } from "@/services/moduleServices";
import { walletService, categoryService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/utils";
import type { ExpenseTemplate, Wallet, Category } from "@/types";

const schema = z.object({
  walletId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1),
  defaultAmount: z.number().min(0).optional(),
  type: z.enum(["expense", "income"]),
  icon: z.string(),
  color: z.string(),
  isPinned: z.boolean(),
});
type FormData = z.infer<typeof schema>;

const ICONS = ["coffee", "cup-soda", "utensils", "fuel", "shopping-cart", "bus", "bike", "pizza"];
const COLORS = ["#3B82F6", "#10B981", "#F97316", "#EC4899", "#A855F7", "#0EA5E9", "#EF4444"];

export default function TemplatePage() {
  const [items, setItems] = useState<ExpenseTemplate[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingId, setUsingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseTemplate | null>(null);
  const [deleting, setDeleting] = useState<ExpenseTemplate | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      walletId: 0,
      categoryId: null,
      name: "",
      defaultAmount: 0,
      type: "expense",
      icon: ICONS[0],
      color: COLORS[0],
      isPinned: false,
    },
  });

  const txType = watch("type");

  const load = async () => {
    setLoading(true);
    try {
      setItems(await templateService.list());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    Promise.all([walletService.list(), categoryService.list()]).then(([w, c]) => {
      setWallets(w.wallets);
      setCategories(c);
    }).catch(() => {});
  }, []);

  const openForm = (t: ExpenseTemplate | null) => {
    setEditing(t);
    if (t) {
      reset({
        walletId: t.walletId || 0,
        categoryId: t.categoryId,
        name: t.name,
        defaultAmount: t.defaultAmount ? Number(t.defaultAmount) : 0,
        type: t.type,
        icon: t.icon,
        color: t.color,
        isPinned: t.isPinned,
      });
    } else {
      reset({
        walletId: wallets[0]?.id || 0,
        categoryId: null,
        name: "",
        defaultAmount: 0,
        type: "expense",
        icon: ICONS[0],
        color: COLORS[0],
        isPinned: false,
      });
    }
    setFormOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        categoryId: data.categoryId || null,
        defaultAmount: data.defaultAmount || null,
      };
      if (editing) {
        await templateService.update(editing.id, payload);
        toast.success("Đã cập nhật");
      } else {
        await templateService.create(payload);
        toast.success("Đã tạo mẫu");
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
      await templateService.remove(deleting.id);
      toast.success("Đã xoá");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const applyTemplate = async (t: ExpenseTemplate) => {
    setUsingId(t.id);
    try {
      await templateService.use(t.id, {});
      toast.success(`Đã tạo giao dịch "${t.name}"`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUsingId(null);
    }
  };

  const filteredCats = categories.filter((c) => c.type === txType);

  return (
    <div>
      <PageHeader
        title="Mẫu chi nhanh"
        description="1 click để tạo giao dịch hay làm"
        action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Thêm mẫu</Button>}
      />

      {loading ? (
        <Card><CardContent className="p-8">Đang tải...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Chưa có mẫu"
          description="Tạo mẫu cho cà phê, trà sữa, xăng... → 1 click tạo giao dịch"
          action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Tạo mẫu</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((t) => (
            <Card key={t.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <IconBubble icon={t.icon} color={t.color} size="lg" />
                  <div className="flex gap-1">
                    {t.isPinned && (
                      <span className="text-warning" title="Ghim">
                        <Pin className="size-4 fill-current" />
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold truncate">{t.name}</h3>
                {t.defaultAmount && (
                  <p className="text-lg font-bold mt-1" style={{ color: t.color }}>
                    {formatCurrency(t.defaultAmount)}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={t.type === "income" ? "success" : "secondary"} className="text-xs">
                    {t.type === "income" ? "Thu" : "Chi"}
                  </Badge>
                  {t.usageCount > 0 && (
                    <span className="text-xs text-muted-foreground">{t.usageCount} lần</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1 mt-3">
                  <Button
                    size="sm"
                    className="col-span-2"
                    onClick={() => applyTemplate(t)}
                    loading={usingId === t.id}
                  >
                    <Zap className="size-4" /> Dùng
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => openForm(t)}>
                    <Pencil className="size-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleting(t)}
                >
                  <Trash2 className="size-4" /> Xoá
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa mẫu" : "Tạo mẫu mới"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên</Label>
              <Input {...register("name")} placeholder="VD: Cà phê, Trà sữa..." />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Loại</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Chi</SelectItem>
                        <SelectItem value="income">Thu</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Số tiền mặc định</Label>
                <Controller
                  control={control}
                  name="defaultAmount"
                  render={({ field }) => (
                    <CurrencyInput value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
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
                        {filteredCats.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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

            <Controller
              control={control}
              name="isPinned"
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  <span className="text-sm">Ghim mẫu này lên đầu</span>
                </label>
              )}
            />

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
        title="Xoá mẫu?"
        loading={delLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
