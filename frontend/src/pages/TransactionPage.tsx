import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { Plus, Pencil, Trash2, Filter, X, Search, ListOrdered, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Bookmark, Save, RotateCcw, Receipt } from "lucide-react";
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
import { getBackendAssetUrl } from "@/lib/env";
import { onTransactionsChanged } from "@/lib/realtime";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction, Wallet, Category, Pagination } from "@/types";

type SavedTxFilter = {
  id: string;
  name: string;
  filter: ListTxQuery;
};

const SAVED_FILTERS_KEY = "money-manager:saved-transaction-filters";

const readSavedFilters = (): SavedTxFilter[] => {
  try {
    const raw = localStorage.getItem(SAVED_FILTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeSavedFilters = (items: SavedTxFilter[]) => {
  localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(items));
};

export default function TransactionPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedTxFilter[]>(() => readSavedFilters());
  const [showTrash, setShowTrash] = useState(false);
  const [trashItems, setTrashItems] = useState<Transaction[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await transactionService.list(filter);
      setItems(data.items);
      setPagination(data.pagination);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => onTransactionsChanged(() => {
    void load({ silent: true });
  }), [load]);

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
      void load({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const res = await transactionService.removeMany(ids);
      toast.success(res.message || `Đã xoá ${ids.length} giao dịch`);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      void load({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const loadTrash = async () => {
    setTrashLoading(true);
    try {
      const data = await transactionService.trash(1, 20);
      setTrashItems(data.items);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTrashLoading(false);
    }
  };

  const toggleTrash = () => {
    setShowTrash((current) => {
      const next = !current;
      if (next) void loadTrash();
      return next;
    });
  };

  const restoreTransaction = async (id: number) => {
    try {
      await transactionService.restore(id);
      toast.success("Đã khôi phục giao dịch");
      await Promise.all([load({ silent: true }), loadTrash()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allCurrentPageSelected =
    items.length > 0 && items.every((tx) => selectedIds.has(tx.id));

  const toggleCurrentPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allCurrentPageSelected) {
        items.forEach((tx) => next.delete(tx.id));
      } else {
        items.forEach((tx) => next.add(tx.id));
      }
      return next;
    });
  };

  const updateFilter = (patch: Partial<ListTxQuery>) => {
    setFilter((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilter({ page: 1, limit: 20, sortBy: "transactionDate", sortDir: "desc" });
  };

  const saveCurrentFilter = () => {
    const name = window.prompt("Nhập tên bộ lọc");
    if (!name?.trim()) return;
    const normalizedFilter: ListTxQuery = {
      ...filter,
      page: 1,
      limit: filter.limit || 20,
      sortBy: filter.sortBy || "transactionDate",
      sortDir: filter.sortDir || "desc",
    };
    const next = [
      { id: crypto.randomUUID(), name: name.trim(), filter: normalizedFilter },
      ...savedFilters,
    ].slice(0, 10);
    writeSavedFilters(next);
    setSavedFilters(next);
    toast.success("Đã lưu bộ lọc");
  };

  const applySavedFilter = (id: string) => {
    const item = savedFilters.find((saved) => saved.id === id);
    if (!item) return;
    setFilter({ ...item.filter, page: 1 });
    toast.success(`Đã áp dụng bộ lọc "${item.name}"`);
  };

  const removeSavedFilter = (id: string) => {
    const next = savedFilters.filter((saved) => saved.id !== id);
    writeSavedFilters(next);
    setSavedFilters(next);
  };

  const activeFilterCount = [
    filter.type,
    filter.walletId,
    filter.categoryId,
    filter.fromDate,
    filter.toDate,
    filter.search,
    filter.tag,
    filter.hasReceipt,
  ].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Giao dịch"
        description={`Tổng ${pagination.total} giao dịch`}
        action={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            {selectedIds.size > 0 && (
              <Button variant="destructive" onClick={() => setBulkDeleteOpen(true)} className="flex-1 sm:flex-none">
                <Trash2 className="size-4" /> Xoá đã chọn ({selectedIds.size})
              </Button>
            )}
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="flex-1 sm:flex-none">
              <Plus className="size-4" /> Thêm giao dịch
            </Button>
            <Button variant="outline" onClick={toggleTrash} className="flex-1 sm:flex-none">
              <RotateCcw className="size-4" /> Thùng rác
            </Button>
          </div>
        }
      />

      {/* Search + Filter toggle */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo mô tả, ghi chú..."
            value={filter.search || ""}
            onChange={(e) => updateFilter({ search: e.target.value || undefined })}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilter((s) => !s)} className="relative w-full sm:w-auto">
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
            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-2">
                <Label>Bộ lọc đã lưu</Label>
                <Select value="" onValueChange={applySavedFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={savedFilters.length ? "Chọn bộ lọc nhanh" : "Chưa có bộ lọc đã lưu"} />
                  </SelectTrigger>
                  <SelectContent>
                    {savedFilters.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={saveCurrentFilter} className="w-full lg:w-auto">
                <Save className="size-4" /> Lưu bộ lọc
              </Button>
            </div>

            {savedFilters.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {savedFilters.map((item) => (
                  <div key={item.id} className="inline-flex overflow-hidden rounded-md border bg-secondary text-secondary-foreground">
                    <button
                      type="button"
                      onClick={() => applySavedFilter(item.id)}
                      className="inline-flex min-h-8 items-center gap-1 px-3 text-sm font-medium hover:bg-secondary/80"
                    >
                      <Bookmark className="size-3.5" />
                      {item.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedFilter(item.id)}
                      className="min-h-8 border-l px-2 text-sm hover:bg-background/60"
                      aria-label={`Xóa bộ lọc ${item.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

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

              <div className="space-y-2">
                <Label>Tag</Label>
                <Input
                  value={filter.tag || ""}
                  onChange={(e) => updateFilter({ tag: e.target.value.trim() || undefined })}
                  placeholder="VD: di_choi"
                />
              </div>

              <div className="space-y-2">
                <Label>Hoa don</Label>
                <Select
                  value={filter.hasReceipt === undefined ? "all" : filter.hasReceipt ? "yes" : "no"}
                  onValueChange={(v) => updateFilter({ hasReceipt: v === "all" ? undefined : v === "yes" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tat ca</SelectItem>
                    <SelectItem value="yes">Co hoa don</SelectItem>
                    <SelectItem value="no">Khong hoa don</SelectItem>
                  </SelectContent>
                </Select>
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

      {showTrash && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Thùng rác giao dịch</p>
                <p className="text-sm text-muted-foreground">Khôi phục giao dịch sẽ tính lại số dư ví ngay.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleTrash}>
                <X className="size-4" />
              </Button>
            </div>
            {trashLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải thùng rác...</p>
            ) : trashItems.length === 0 ? (
              <EmptyState title="Thùng rác trống" />
            ) : (
              <div className="space-y-2">
                {trashItems.map((tx) => (
                  <div key={tx.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tx.description || tx.Category?.name || "(không mô tả)"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.transactionDate)} · Xóa lúc {tx.deletedAt ? formatDate(tx.deletedAt) : "không rõ"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className={tx.type === "income" ? "font-semibold text-income" : "font-semibold text-expense"}>
                        {formatCurrency(tx.amount)}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => restoreTransaction(tx.id)}>
                        <RotateCcw className="size-4" /> Khôi phục
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="mb-3 flex flex-col gap-3 rounded-lg border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={allCurrentPageSelected}
              onChange={toggleCurrentPage}
              className="size-4 rounded border-input"
            />
            Chọn tất cả trang này
          </label>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto">
              <Trash2 className="size-4" /> Xoá {selectedIds.size} giao dịch
            </Button>
          )}
        </div>
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
                <li key={tx.id} className="flex flex-wrap items-start gap-3 p-3 transition hover:bg-accent/50 sm:flex-nowrap sm:items-center sm:gap-4 sm:p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelected(tx.id)}
                    className="size-4 shrink-0 rounded border-input"
                    aria-label={`Chọn giao dịch ${tx.description || tx.id}`}
                  />
                  <IconBubble icon={tx.Category?.icon} color={tx.Category?.color} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {tx.description || tx.Category?.name || "(không có mô tả)"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(tx.transactionDate)}</span>
                      {tx.transactionTime && (
                        <>
                          <span>·</span>
                          <span>{tx.transactionTime.slice(0, 5)}</span>
                        </>
                      )}
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
                      {Array.isArray(tx.metadata?.tags) && tx.metadata.tags.slice(0, 3).map((tag) => (
                        <Badge key={String(tag)} variant="secondary" className="text-[10px] py-0">
                          #{String(tag)}
                        </Badge>
                      ))}
                      {tx.receiptUrl && (
                        <a
                          href={getBackendAssetUrl(tx.receiptUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-accent"
                        >
                          <Receipt className="size-3" />
                          Hóa đơn
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="ml-9 flex w-[calc(100%-2.25rem)] items-center justify-between gap-2 text-left sm:ml-0 sm:block sm:w-auto sm:shrink-0 sm:text-right">
                    <p className={`flex items-center gap-1 font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                      {tx.type === "income" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                      {formatCurrency(tx.amount)}
                    </p>
                    <div className="flex shrink-0 gap-1 sm:hidden">
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
                  </div>
                  <div className="hidden shrink-0 gap-1 sm:flex">
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
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {pagination.page} / {pagination.totalPages}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
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
        onSaved={() => load({ silent: true })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Xoá giao dịch?"
        description="Số dư của ví sẽ được điều chỉnh tương ứng."
        loading={delLoading}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Xoá ${selectedIds.size} giao dịch?`}
        description="Số dư của các ví liên quan sẽ được hoàn tác theo từng giao dịch đã chọn."
        loading={bulkDeleteLoading}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
