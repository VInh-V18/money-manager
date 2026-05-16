import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { Activity, Shield } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { adminService, type AdminDashboard, type AdminUserGrowth } from "@/services/adminService";
import { getErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDateTime } from "@/lib/utils";
import type { ActivityLog, Feedback, User } from "@/types";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "SUPPORT", "AUDITOR"]);
const FEEDBACK_STATUSES: Feedback["status"][] = ["reviewing", "resolved", "closed"];
const USER_ROLES: User["role"][] = ["USER", "PREMIUM_USER", "SUPPORT", "AUDITOR", "ADMIN", "SUPER_ADMIN"];

const formatPayload = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "";
  try {
    return JSON.stringify(payload).slice(0, 120);
  } catch {
    return "";
  }
};

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [userGrowth, setUserGrowth] = useState<AdminUserGrowth[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<User["role"] | "all">("all");
  const [feedbackStatus, setFeedbackStatus] = useState<Feedback["status"] | "all">("all");
  const [loading, setLoading] = useState(true);

  const loadUsers = async (q = userSearch, role = userRoleFilter) => {
    const data = await adminService.users(1, 12, q.trim(), role === "all" ? "" : role);
    setUsers(data.items);
  };

  const loadFeedback = async (status = feedbackStatus) => {
    const data = await adminService.feedback(1, 12);
    setFeedback(status === "all" ? data.items : data.items.filter((item) => item.status === status));
  };

  useEffect(() => {
    if (!user || !ADMIN_ROLES.has(user.role)) return;
    setLoading(true);
    Promise.all([
      adminService.dashboard(),
      adminService.users(1, 8),
      adminService.feedback(1, 12),
      adminService.systemLogs(1, 12),
      adminService.userGrowth(),
    ])
      .then(([stats, userData, feedbackData, logData, growthData]) => {
        setDashboard(stats);
        setUsers(userData.items);
        setFeedback(feedbackData.items);
        setLogs(logData.items);
        setUserGrowth(growthData);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  const updateFeedbackStatus = async (id: number, status: Feedback["status"]) => {
    try {
      const updated = await adminService.updateFeedbackStatus(id, status);
      setFeedback((items) => items.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      toast.success("Đã cập nhật phản hồi");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const updateUserRole = async (id: number, role: User["role"]) => {
    try {
      const updated = await adminService.updateUserRole(id, role);
      setUsers((items) => items.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      toast.success("Đã cập nhật vai trò");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <PageHeader title="Admin" description="Theo dõi hệ thống, người dùng và phản hồi" />

      {loading || !dashboard ? (
        <Card><CardContent className="p-8">Đang tải bảng điều khiển...</CardContent></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Tổng người dùng", dashboard.totalUsers],
              ["Người dùng mới hôm nay", dashboard.newUsersToday],
              ["Tổng giao dịch", dashboard.totalTransactions],
              ["Tổng ví", dashboard.totalWallets],
              ["Phản hồi đang mở", dashboard.openFeedback],
              ["Đăng nhập lỗi hôm nay", dashboard.failedLoginsToday],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tăng trưởng người dùng 30 ngày</CardTitle>
            </CardHeader>
            <CardContent>
              {userGrowth.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu tăng trưởng.</p>
              ) : (
                <div className="space-y-2">
                  {userGrowth.map((item) => {
                    const count = Number(item.count) || 0;
                    const max = Math.max(...userGrowth.map((row) => Number(row.count) || 0), 1);
                    return (
                      <div key={item.date} className="grid grid-cols-[88px_1fr_36px] items-center gap-3 text-sm">
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (count / max) * 100)}%` }} />
                        </div>
                        <span className="text-right font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="size-5" />
                    Người dùng gần đây
                  </CardTitle>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void loadUsers();
                      }}
                      placeholder="Tìm email, username, tên"
                    />
                    <Select
                      value={userRoleFilter}
                      onValueChange={(value) => {
                        const role = value as User["role"] | "all";
                        setUserRoleFilter(role);
                        void loadUsers(userSearch, role);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả vai trò</SelectItem>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={() => loadUsers()} className="shrink-0">
                      Tìm
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không tìm thấy người dùng.</p>
                ) : users.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{item.displayName}</p>
                        <p className="text-xs text-muted-foreground">{item.email} - {item.role}</p>
                      </div>
                      <Select
                        value={item.role}
                        onValueChange={(role) => updateUserRole(item.id, role as User["role"])}
                        disabled={item.id === user.id && item.role === "SUPER_ADMIN"}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Phản hồi gần đây</CardTitle>
                  <Select
                    value={feedbackStatus}
                    onValueChange={(value) => {
                      const status = value as Feedback["status"] | "all";
                      setFeedbackStatus(status);
                      void loadFeedback(status);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="open">Đang mở</SelectItem>
                      <SelectItem value="reviewing">Đang xem xét</SelectItem>
                      <SelectItem value="resolved">Đã giải quyết</SelectItem>
                      <SelectItem value="closed">Đã đóng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có phản hồi.</p>
                ) : feedback.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.type} - {item.status} - {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:justify-end">
                        {FEEDBACK_STATUSES.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={item.status === status ? "default" : "outline"}
                            onClick={() => updateFeedbackStatus(item.id, status)}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5" />
                Nhật ký hệ thống gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có nhật ký hệ thống.</p>
              ) : logs.map((item) => {
                const payload = formatPayload(item.payload);
                return (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{item.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.entityType}
                          {item.entityId ? ` #${item.entityId}` : ""} - {item.User?.email ?? `User ${item.userId}`}
                        </p>
                        {payload && <p className="mt-1 break-words text-xs text-muted-foreground">{payload}</p>}
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
