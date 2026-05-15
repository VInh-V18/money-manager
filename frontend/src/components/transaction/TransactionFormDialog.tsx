import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { transactionService } from "@/services/transactionService";
import { walletService, categoryService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import { getBackendAssetUrl } from "@/lib/env";
import { toISODate } from "@/lib/utils";
import type { Transaction, Wallet, Category } from "@/types";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  walletId: z.number().int().positive("Chọn ví"),
  categoryId: z.number().int().positive().nullable().optional(),
  amount: z.number().positive("Số tiền phải > 0"),
  description: z.string().optional(),
  note: z.string().optional(),
  transactionDate: z.string(),
  receiptUrl: z.string().nullable().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  onSaved: () => void;
}

export function TransactionFormDialog({ open, onClose, transaction, onSaved }: Props) {
  const isEdit = !!transaction;
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | undefined>();

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      walletId: 0,
      categoryId: null,
      amount: 0,
      description: "",
      note: "",
      transactionDate: toISODate(new Date()),
      receiptUrl: null,
    },
  });

  const txType = watch("type");

  useEffect(() => {
    if (!open) return;
    Promise.all([walletService.list(), categoryService.list()])
      .then(([w, c]) => {
        setWallets(w.wallets.filter((x) => x.isActive));
        setCategories(c);
      })
      .catch((e) => toast.error(getErrorMessage(e)));
  }, [open]);

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        walletId: transaction.walletId,
        categoryId: transaction.categoryId,
        amount: Number(transaction.amount),
        description: transaction.description || "",
        note: transaction.note || "",
        transactionDate: transaction.transactionDate,
        receiptUrl: transaction.receiptUrl || null,
      });
      setReceiptPreview(getBackendAssetUrl(transaction.receiptUrl));
    } else {
      reset({
        type: "expense",
        walletId: wallets[0]?.id || 0,
        categoryId: null,
        amount: 0,
        description: "",
        note: "",
        transactionDate: toISODate(new Date()),
        receiptUrl: null,
      });
      setReceiptPreview(undefined);
    }
    setReceiptFile(null);
  }, [transaction, reset, open, wallets]);

  const onSubmit = async (data: FormData) => {
    try {
      let receiptUrl = data.receiptUrl || null;
      if (receiptFile) {
        receiptUrl = await transactionService.uploadReceipt(receiptFile);
      }
      const payload = {
        ...data,
        categoryId: data.categoryId || null,
        receiptUrl,
      };
      if (isEdit) {
        await transactionService.update(transaction!.id, payload);
        toast.success("Đã cập nhật giao dịch");
      } else {
        await transactionService.create(payload);
        toast.success("Đã thêm giao dịch");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chọn file ảnh hóa đơn");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh hóa đơn tối đa 5MB");
      return;
    }
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const filteredCats = categories.filter((c) => c.type === txType);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa giao dịch" : "Thêm giao dịch"}</DialogTitle>
          <DialogDescription>
            Nhập thông tin giao dịch và đính kèm ảnh hóa đơn nếu có.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tabs Type */}
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => field.onChange("expense")}
                  className={`py-3 rounded-lg font-medium transition ${
                    field.value === "expense"
                      ? "bg-destructive text-destructive-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  💸 Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange("income")}
                  className={`py-3 rounded-lg font-medium transition ${
                    field.value === "income"
                      ? "bg-success text-success-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  💰 Thu nhập
                </button>
              </div>
            )}
          />

          <div className="space-y-2">
            <Label>Số tiền</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0"
                  className="text-2xl font-bold h-14"
                />
              )}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
              {errors.walletId && <p className="text-xs text-destructive">{errors.walletId.message}</p>}
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
                    <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
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
            <Label>Mô tả</Label>
            <Input {...register("description")} placeholder="VD: Ăn trưa, đổ xăng..." />
          </div>

          <div className="space-y-2">
            <Label>Ngày</Label>
            <Input type="date" {...register("transactionDate")} />
          </div>

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea {...register("note")} rows={2} placeholder="Tuỳ chọn" />
          </div>

          <div className="space-y-2">
            <Label>Ảnh hóa đơn</Label>
            <Input type="file" accept="image/*" onChange={handleReceiptChange} />
            {receiptPreview && (
              <div className="overflow-hidden rounded-lg border">
                <img src={receiptPreview} alt="Ảnh hóa đơn" className="max-h-48 w-full object-contain bg-muted" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? "Cập nhật" : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
