import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, toISODate } from "@/lib/utils";
import { walletService } from "@/services/walletService";
import type { Wallet } from "@/types";

const schema = z
  .object({
    fromWalletId: z.number().int().positive("Chọn ví nguồn"),
    toWalletId: z.number().int().positive("Chọn ví nhận"),
    amount: z.number().positive("Số tiền phải lớn hơn 0"),
    fee: z.number().min(0, "Phí không được âm"),
    transferDate: z.string().min(1, "Chọn ngày chuyển"),
    note: z.string().max(500).optional(),
  })
  .refine((data) => data.fromWalletId !== data.toWalletId, {
    path: ["toWalletId"],
    message: "Ví nguồn và ví nhận phải khác nhau",
  });

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onSaved: () => void;
}

export function WalletTransferDialog({ open, onClose, wallets, onSaved }: Props) {
  const activeWallets = useMemo(
    () => wallets.filter((wallet) => wallet.isActive),
    [wallets]
  );
  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromWalletId: 0,
      toWalletId: 0,
      amount: 0,
      fee: 0,
      transferDate: toISODate(new Date()),
      note: "",
    },
  });

  const fromWalletId = watch("fromWalletId");
  const fromWallet = activeWallets.find((wallet) => wallet.id === fromWalletId);

  useEffect(() => {
    if (!open) return;
    reset({
      fromWalletId: activeWallets[0]?.id || 0,
      toWalletId: activeWallets.find((wallet) => wallet.id !== activeWallets[0]?.id)?.id || 0,
      amount: 0,
      fee: 0,
      transferDate: toISODate(new Date()),
      note: "",
    });
  }, [activeWallets, open, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await walletService.transfer(data);
      toast.success("Đã chuyển tiền giữa ví");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, "Chuyển tiền không thành công"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5" />
            Chuyển tiền giữa ví
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ví nguồn</Label>
              <Controller
                control={control}
                name="fromWalletId"
                render={({ field }) => (
                  <Select value={String(field.value || "")} onValueChange={(value) => field.onChange(Number(value))}>
                    <SelectTrigger><SelectValue placeholder="Chọn ví nguồn" /></SelectTrigger>
                    <SelectContent>
                      {activeWallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={String(wallet.id)}>
                          {wallet.name} - {formatCurrency(wallet.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.fromWalletId && <p className="text-xs text-destructive">{errors.fromWalletId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Ví nhận</Label>
              <Controller
                control={control}
                name="toWalletId"
                render={({ field }) => (
                  <Select value={String(field.value || "")} onValueChange={(value) => field.onChange(Number(value))}>
                    <SelectTrigger><SelectValue placeholder="Chọn ví nhận" /></SelectTrigger>
                    <SelectContent>
                      {activeWallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={String(wallet.id)}>
                          {wallet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.toWalletId && <p className="text-xs text-destructive">{errors.toWalletId.message}</p>}
            </div>
          </div>

          {fromWallet && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Số dư ví nguồn: <span className="font-medium text-foreground">{formatCurrency(fromWallet.balance)}</span>
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Số tiền chuyển</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} placeholder="0" />}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Phí chuyển</Label>
              <Controller
                control={control}
                name="fee"
                render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} placeholder="0" />}
              />
              {errors.fee && <p className="text-xs text-destructive">{errors.fee.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ngày chuyển</Label>
            <Input type="date" {...register("transferDate")} />
            {errors.transferDate && <p className="text-xs text-destructive">{errors.transferDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea rows={2} placeholder="Tùy chọn" {...register("note")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" loading={isSubmitting}>Chuyển tiền</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
