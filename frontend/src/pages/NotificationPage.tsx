import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Trash2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { notificationService } from "@/services/moduleServices";
import { getErrorMessage } from "@/lib/axios";
import { formatRelative } from "@/lib/utils";
import type { Notification } from "@/types";
import { cn } from "@/lib/utils";

export default function NotificationPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.list(1, 50, filter === "unread");
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    try {
      await notificationService.markRead(id);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      toast.success("Đã đánh dấu tất cả");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (id: number) => {
    try {
      await notificationService.remove(id);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeAllRead = async () => {
    try {
      await notificationService.removeAllRead();
      toast.success("Đã xoá thông báo đã đọc");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const severityIcon = (s: Notification["severity"]) => {
    if (s === "danger") return <AlertCircle className="size-5 text-destructive" />;
    if (s === "warning") return <AlertTriangle className="size-5 text-warning" />;
    return <Info className="size-5 text-primary" />;
  };

  return (
    <div>
      <PageHeader
        title="Thông báo"
        description={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả đã đọc"}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
              <Check className="size-4" /> Đọc tất cả
            </Button>
            <Button size="sm" variant="outline" onClick={removeAllRead}>
              <Trash2 className="size-4" /> Xóa đã đọc
            </Button>
          </div>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="unread">Chưa đọc {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
        </TabsList>
        <TabsContent value={filter}>
          {loading ? (
            <Card><CardContent className="p-8">Đang tải...</CardContent></Card>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={filter === "unread" ? "Không có thông báo mới" : "Chưa có thông báo"}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {items.map((n) => (
                    <li
                      key={n.id}
                      className={cn(
                        "flex gap-3 p-4 transition",
                        !n.isRead && "bg-primary/5"
                      )}
                    >
                      <div className="shrink-0 mt-0.5">{severityIcon(n.severity)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatRelative(n.createdAt)}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {!n.isRead && (
                          <Button size="icon-sm" variant="ghost" onClick={() => markRead(n.id)} title="Đánh dấu đã đọc">
                            <Check className="size-4" />
                          </Button>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => remove(n.id)}
                          className="text-destructive"
                          title="Xóa"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
