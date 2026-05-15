import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { adminService, type AdminDashboard } from "@/services/adminService";
import { getErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDateTime } from "@/lib/utils";
import type { Feedback, User } from "@/types";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "SUPPORT", "AUDITOR"]);

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !ADMIN_ROLES.has(user.role)) return;
    setLoading(true);
    Promise.all([
      adminService.dashboard(),
      adminService.users(1, 8),
      adminService.feedback(1, 8),
    ])
      .then(([stats, userData, feedbackData]) => {
        setDashboard(stats);
        setUsers(userData.items);
        setFeedback(feedbackData.items);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <PageHeader title="Admin" description="Theo dõi hệ thống, người dùng và phản hồi" />

      {loading || !dashboard ? (
        <Card><CardContent className="p-8">Đang tải admin dashboard...</CardContent></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Tổng user", dashboard.totalUsers],
              ["User mới hôm nay", dashboard.newUsersToday],
              ["Tổng giao dịch", dashboard.totalTransactions],
              ["Tổng ví", dashboard.totalWallets],
              ["Feedback mở", dashboard.openFeedback],
              ["Login lỗi hôm nay", dashboard.failedLoginsToday],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5" />
                  User gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {users.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="font-medium">{item.displayName}</p>
                    <p className="text-xs text-muted-foreground">{item.email} · {item.role}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback gần đây</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có feedback.</p>
                ) : feedback.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type} · {item.status} · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
