import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { walletService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import type { Wallet, WalletType } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên ví"),
  type: z.enum(["cash", "bank", "ewallet", "saving", "investment", "other"]),
  initialBalance: z.number().min(0, "Số dư không thể âm"),
  lowBalanceThreshold: z.number().min(0).nullable().optional(),
  color: z.string(),
  icon: z.string(),
  note: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const TYPE_LABELS: Record<WalletType, string> = {
  cash: "Tiền mặt",
  bank: "Ngân hàng",
  ewallet: "Ví điện tử",
  saving: "Tiết kiệm",
  investment: "Đầu tư",
  other: "Khác",
};

const COLORS = ["#3B82F6", "#10B981", "#EC4899", "#F97316", "#A855F7", "#0EA5E9", "#EF4444"];
const ICONS = ["wallet", "banknote", "credit-card", "landmark", "smartphone", "piggy-bank", "trending-up"];

interface Props {
  open: boolean;
  onClose: () => void;
  wallet?: Wallet | null;
  onSaved: () => void;
}

export function WalletFormDialog({ open, onClose, wallet, onSaved }: Props) {
  const isEdit = !!wallet;
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "cash",
      initialBalance: 0,
      lowBalanceThreshold: null,
      color: COLORS[0],
      icon: ICONS[0],
      note: "",
    },
  });

  useEffect(() => {
    if (wallet) {
      reset({
        name: wallet.name,
        type: wallet.type,
        initialBalance: Number(wallet.initialBalance),
        lowBalanceThreshold: wallet.lowBalanceThreshold === null ? null : Number(wallet.lowBalanceThreshold),
        color: wallet.color,
        icon: wallet.icon,
        note: wallet.note || "",
      });
    } else {
      reset({ name: "", type: "cash", initialBalance: 0, lowBalanceThreshold: null, color: COLORS[0], icon: ICONS[0], note: "" });
    }
  }, [wallet, reset, open]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        // khi edit, khong update initialBalance/balance qua API
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { initialBalance, ...rest } = data;
        await walletService.update(wallet!.id, rest);
        toast.success("Đã cập nhật ví");
      } else {
        await walletService.create(data);
        toast.success("Đã tạo ví mới");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa ví" : "Tạo ví mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tên ví</Label>
            <Input {...register("name")} placeholder="VD: Ví tiền mặt, Vietcombank..." />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại ví</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Số dư ban đầu</Label>
              <Controller
                control={control}
                name="initialBalance"
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isEdit}
                    placeholder="0"
                  />
                )}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Số dư hiện tại được tính từ giao dịch, không sửa trực tiếp
                </p>
              )}
            </div>
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
                      key={c}
                      type="button"
                      onClick={() => field.onChange(c)}
                      className={`size-8 rounded-full transition ring-offset-2 ${
                        field.value === c ? "ring-2 ring-foreground" : ""
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea {...register("note")} placeholder="Tuỳ chọn" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Ngưỡng cảnh báo số dư thấp</Label>
            <Controller
              control={control}
              name="lowBalanceThreshold"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value || 0}
                  onChange={(value) => field.onChange(value > 0 ? value : null)}
                  placeholder="0"
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Để 0 nếu không muốn nhận cảnh báo số dư thấp cho ví này.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? "Cập nhật" : "Tạo ví"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
