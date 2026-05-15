import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, History } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { walletService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import type { Wallet, WalletBalanceHistory } from "@/types";

const REASON_LABELS: Record<string, string> = {
  transaction_create: "Tạo giao dịch",
  transaction_update_rollback: "Hoàn tác giao dịch cũ",
  transaction_update_apply: "Áp dụng giao dịch mới",
  transaction_delete: "Xóa giao dịch",
  wallet_transfer_out: "Chuyển tiền đi",
  wallet_transfer_in: "Nhận tiền chuyển",
};

interface Props {
  open: boolean;
  onClose: () => void;
  wallet: Wallet | null;
}

export function WalletBalanceHistoryDialog({ open, onClose, wallet }: Props) {
  const [items, setItems] = useState<WalletBalanceHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !wallet) return;
    setLoading(true);
    walletService
      .balanceHistory(wallet.id, 1, 30)
      .then((data) => setItems(data.items))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [open, wallet]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl" aria-describedby="wallet-balance-history-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" />
            Biến động số dư
          </DialogTitle>
          <DialogDescription id="wallet-balance-history-description">
            {wallet ? `Ví ${wallet.name}` : "Lịch sử thay đổi số dư ví"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Chưa có biến động số dư nào được ghi nhận.
          </div>
        ) : (
          <div className="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
            {items.map((item) => {
              const delta = Number(item.amountChanged);
              const positive = delta >= 0;
              return (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {REASON_LABELS[item.reason] || item.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                        {item.referenceType && item.referenceId
                          ? ` · ${item.referenceType} #${item.referenceId}`
                          : ""}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-1 font-semibold",
                        positive ? "text-income" : "text-expense"
                      )}
                    >
                      {positive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                      {formatCurrency(delta)}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>Trước: {formatCurrency(item.beforeBalance)}</span>
                    <span>Thay đổi: {formatCurrency(item.amountChanged)}</span>
                    <span>Sau: {formatCurrency(item.afterBalance)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button type="button" variant="outline" onClick={onClose}>
          Đóng
        </Button>
      </DialogContent>
    </Dialog>
  );
}
