import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Users, CheckCircle2, AlertCircle, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { debtService } from "@/services/moduleServices";
import { walletService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDate, toISODate } from "@/lib/utils";
import type { Debt, Wallet } from "@/types";

const schema = z.object({
  type: z.enum(["owed_by_me", "owed_to_me"]),
  personName: z.string().min(1),
  personPhone: z.string().optional(),
  amount: z.number().positive(),
  borrowedDate: z.string(),
  dueDate: z.string().optional(),
  note: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function DebtPage() {
  const [items, setItems] = useState<Debt[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"owed_by_me" | "owed_to_me">("owed_by_me");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  // pay debt modal
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payWalletId, setPayWalletId] = useState<number | null>(null);
  const [payDate, setPayDate] = useState(toISODate(new Date()));
  const [paying, setPaying] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "owed_by_me",
      personName: "",
      personPhone: "",
      amount: 0,
      borrowedDate: toISODate(new Date()),
      dueDate: "",
      note: "",
    },
  });

  const load = async () => {
    setLoading(true);
    try {
      setItems(await debtService.list());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    walletService.list().then((w) => setWallets(w.wallets)).catch(() => {});
  }, []);

  const openForm = (d: Debt | null) => {
    setEditing(d);
    if (d) {
      reset({
        type: d.type,
        personName: d.personName,
        personPhone: d.personPhone || "",
        amount: Number(d.amount),
        borrowedDate: d.borrowedDate,
        dueDate: d.dueDate || "",
        note: d.note || "",
      });
    } else {
      reset({
        type: tab,
        personName: "",
        personPhone: "",
        amount: 0,
        borrowedDate: toISODate(new Date()),
        dueDate: "",
        note: "",
      });
    }
    setFormOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, dueDate: data.dueDate || null };
      if (editing) {
        await debtService.update(editing.id, payload);
        toast.success("Đã cập nhật");
      } else {
        await debtService.create(payload);
        toast.success("Đã ghi nhận khoản nợ");
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
      await debtService.remove(deleting.id);
      toast.success("Đã xoá");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const handlePay = async () => {
    if (!payingDebt || payAmount <= 0) return;
    setPaying(true);
    try {
      await debtService.pay(payingDebt.id, {
        amount: payAmount,
        walletId: payWalletId,
        payDate,
      });
      toast.success("Đã ghi nhận thanh toán");
      setPayingDebt(null);
      setPayAmount(0);
      setPayWalletId(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const filtered = items.filter((d) => d.type === tab);

  return (
    <div>
      <PageHeader
        title="Nợ"
        description="Theo dõi tiền vay và cho vay"
        action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Thêm</Button>}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "owed_by_me" | "owed_to_me")}>
        <TabsList>
          <TabsTrigger value="owed_by_me">Tôi đi vay</TabsTrigger>
          <TabsTrigger value="owed_to_me">Người khác nợ tôi</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <Card><CardContent className="p-8">Đang tải...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={tab === "owed_by_me" ? "Bạn không nợ ai cả 🎉" : "Chưa có ai nợ bạn"}
              action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Thêm</Button>}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((d) => {
                const remaining = d.remaining ?? Number(d.amount) - Number(d.paidAmount);
                const progress = (Number(d.paidAmount) / Number(d.amount)) * 100;
                return (
                  <Card key={d.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg">{d.personName}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {d.status === "paid" && (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle2 className="size-3" /> Đã trả xong
                              </Badge>
                            )}
                            {d.status === "overdue" && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="size-3" /> Quá hạn
                              </Badge>
                            )}
                            {d.dueDate && (
                              <Badge variant="outline" className="text-xs">
                                Hạn: {formatDate(d.dueDate)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon-sm" variant="ghost" onClick={() => openForm(d)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setDeleting(d)}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-xl font-bold">{formatCurrency(d.paidAmount)}</span>
                        <span className="text-sm text-muted-foreground">
                          / {formatCurrency(d.amount)}
                        </span>
                      </div>
                      <Progress value={progress} indicatorClassName={d.status === "paid" ? "bg-success" : ""} />
                      <p className="text-sm text-muted-foreground mt-2">
                        Còn lại: <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
                      </p>

                      {d.status !== "paid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => {
                            setPayingDebt(d);
                            setPayAmount(remaining);
                            setPayWalletId(null);
                            setPayDate(toISODate(new Date()));
                          }}
                        >
                          <HandCoins className="size-4" />
                          {d.type === "owed_by_me" ? "Trả nợ" : "Người ta đã trả"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa nợ" : "Thêm khoản nợ"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Loại</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owed_by_me">Tôi đi vay (nợ người khác)</SelectItem>
                      <SelectItem value="owed_to_me">Người khác nợ tôi</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Người</Label>
                <Input {...register("personName")} placeholder="Tên" />
                {errors.personName && <p className="text-xs text-destructive">{errors.personName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>SĐT (tuỳ chọn)</Label>
                <Input {...register("personPhone")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Số tiền</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} />}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ngày vay</Label>
                <Input type="date" {...register("borrowedDate")} />
              </div>
              <div className="space-y-2">
                <Label>Hạn trả (tuỳ chọn)</Label>
                <Input type="date" {...register("dueDate")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea {...register("note")} rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Huỷ</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? "Cập nhật" : "Tạo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay debt */}
      <Dialog open={!!payingDebt} onOpenChange={(o) => !o && setPayingDebt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {payingDebt?.type === "owed_by_me" ? "Trả nợ" : "Nhận tiền"} cho "{payingDebt?.personName}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Số tiền</Label>
              <CurrencyInput value={payAmount} onChange={setPayAmount} className="text-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label>Ví ({payingDebt?.type === "owed_by_me" ? "trừ" : "cộng"} tiền)</Label>
              <Select
                value={payWalletId ? String(payWalletId) : "none"}
                onValueChange={(v) => setPayWalletId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không cập nhật ví</SelectItem>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Chọn ví → tự động tạo giao dịch tương ứng
              </p>
            </div>
            <div className="space-y-2">
              <Label>Ngày</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingDebt(null)}>Huỷ</Button>
            <Button onClick={handlePay} loading={paying} disabled={payAmount <= 0}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Xoá khoản nợ?"
        loading={delLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
