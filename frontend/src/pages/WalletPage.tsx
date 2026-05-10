import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { IconBubble } from "@/components/common/IconBubble";
import { WalletFormDialog } from "@/components/wallet/WalletFormDialog";
import { walletService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/utils";
import type { Wallet } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  cash: "Tiền mặt",
  bank: "Ngân hàng",
  ewallet: "Ví điện tử",
  saving: "Tiết kiệm",
  investment: "Đầu tư",
  other: "Khác",
};

export default function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [deleting, setDeleting] = useState<Wallet | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { wallets, totalBalance } = await walletService.list();
      setWallets(wallets);
      setTotalBalance(totalBalance);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await walletService.remove(deleting.id);
      toast.success("Đã xoá ví");
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
        title="Ví tiền"
        description={`Tổng số dư: ${formatCurrency(totalBalance)}`}
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="size-4" /> Thêm ví
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title="Chưa có ví nào"
          description="Tạo ví đầu tiên để bắt đầu theo dõi tiền của bạn"
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Tạo ví mới
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <Card key={w.id} className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <IconBubble icon={w.icon} color={w.color} size="lg" />
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => { setEditing(w); setFormOpen(true); }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDeleting(w)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-lg">{w.name}</h3>
                <Badge variant="secondary" className="mt-1">{TYPE_LABELS[w.type] || w.type}</Badge>
                <p className="text-2xl font-bold mt-3" style={{ color: w.color }}>
                  {formatCurrency(w.balance)}
                </p>
                {!w.isActive && (
                  <Badge variant="outline" className="mt-2 text-xs">Không hoạt động</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WalletFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        wallet={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Xoá ví?"
        description={`Bạn có chắc muốn xoá ví "${deleting?.name}"? Ví sẽ chỉ xoá được nếu chưa có giao dịch nào.`}
        loading={delLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
