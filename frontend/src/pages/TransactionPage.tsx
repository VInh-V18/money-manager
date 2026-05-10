import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { Plus, Pencil, Trash2, Filter, X, Search, ListOrdered, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { IconBubble } from "@/components/common/IconBubble";
import { TransactionFormDialog } from "@/components/transaction/TransactionFormDialog";
import { transactionService, type ListTxQuery } from "@/services/transactionService";
import { walletService, categoryService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction, Wallet, Category, Pagination } from "@/types";

export default function TransactionPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  // filters
  const [filter, setFilter] = useState<ListTxQuery>({
    page: 1,
    limit: 20,
    sortBy: "transactionDate",
    sortDir: "desc",
  });

  // dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transactionService.list(filter);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([walletService.list(), categoryService.list()]).then(([w, c]) => {
      setWallets(w.wallets);
      setCategories(c);
    }).catch(() => {});
  }, []);

  // mở form khi có ?new=1
  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await transactionService.remove(deleting.id);
      toast.success("Đã xoá giao dịch");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const updateFilter = (patch: Partial<ListTxQuery>) => {
    setFilter((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilter({ page: 1, limit: 20, sortBy: "transactionDate", sortDir: "desc" });
  };

  const activeFilterCount = [
    filter.type, filter.walletId, filter.categoryId, filter.fromDate, filter.toDate, filter.search,
  ].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Giao dịch"
        description={`Tổng ${pagination.total} giao dịch`}
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="size-4" /> Thêm giao dịch
          </Button>
        }
      />

      {/* Search + Filter toggle */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo mô tả, ghi chú..."
            value={filter.search || ""}
            onChange={(e) => updateFilter({ search: e.target.value || undefined })}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilter((s) => !s)} className="relative">
          <Filter className="size-4" />
          Bộ lọc
          {activeFilterCount > 0 && (
            <Badge variant="default" className="absolute -top-2 -right-2 px-1.5 py-0">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Loại</Label>
                <Select
                  value={filter.type || "all"}
                  onValueChange={(v) => updateFilter({ type: v === "all" ? undefined : v as "income" | "expense" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="expense">Chi tiêu</SelectItem>
                    <SelectItem value="income">Thu nhập</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ví</Label>
                <Select
                  value={filter.walletId ? String(filter.walletId) : "all"}
                  onValueChange={(v) => updateFilter({ walletId: v === "all" ? undefined : Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả ví</SelectItem>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select
                  value={filter.categoryId ? String(filter.categoryId) : "all"}
                  onValueChange={(v) => updateFilter({ categoryId: v === "all" ? undefined : Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={filter.fromDate || ""}
                  onChange={(e) => updateFilter({ fromDate: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={filter.toDate || ""}
                  onChange={(e) => updateFilter({ toDate: e.target.value || undefined })}
                />
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X className="size-4" /> Xoá bộ lọc
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <Card><CardContent className="p-8">Đang tải...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="Không có giao dịch"
          description={activeFilterCount > 0 ? "Thử thay đổi bộ lọc" : "Hãy thêm giao dịch đầu tiên"}
          action={
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="size-4" /> Thêm
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((tx) => (
                <li key={tx.id} className="flex items-center gap-4 p-4 hover:bg-accent/50 transition">
                  <IconBubble icon={tx.Category?.icon} color={tx.Category?.color} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {tx.description || tx.Category?.name || "(không có mô tả)"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(tx.transactionDate)}</span>
                      <span>·</span>
                      <span>{tx.Wallet?.name}</span>
                      {tx.Category?.name && (
                        <>
                          <span>·</span>
                          <span>{tx.Category.name}</span>
                        </>
                      )}
                      {tx.subType !== "regular" && tx.subType && (
                        <Badge variant="outline" className="text-[10px] py-0">{tx.subType}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold flex items-center gap-1 ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                      {tx.type === "income" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon-sm" variant="ghost" onClick={() => { setEditing(tx); setFormOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDeleting(tx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Trang {pagination.page} / {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => updateFilter({ page: pagination.page - 1 })}
            >
              <ChevronLeft className="size-4" /> Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateFilter({ page: pagination.page + 1 })}
            >
              Sau <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <TransactionFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        transaction={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Xoá giao dịch?"
        description="Số dư của ví sẽ được điều chỉnh tương ứng."
        loading={delLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
