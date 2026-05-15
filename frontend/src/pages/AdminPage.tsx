import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { adminService, type AdminDashboard } from "@/services/adminService";
import { getErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDateTime } from "@/lib/utils";
import type { Feedback, User } from "@/types";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "SUPPORT", "AUDITOR"]);
const FEEDBACK_STATUSES: Feedback["status"][] = ["reviewing", "resolved", "closed"];
const USER_ROLES: User["role"][] = ["USER", "PREMIUM_USER", "SUPPORT", "AUDITOR", "ADMIN", "SUPER_ADMIN"];

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [feedbackStatus, setFeedbackStatus] = useState<Feedback["status"] | "all">("all");
  const [loading, setLoading] = useState(true);

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
    ])
      .then(([stats, userData, feedbackData]) => {
        setDashboard(stats);
        setUsers(userData.items);
        setFeedback(feedbackData.items);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  const updateFeedbackStatus = async (id: number, status: Feedback["status"]) => {
    try {
      const updated = await adminService.updateFeedbackStatus(id, status);
      setFeedback((items) => items.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      toast.success("Da cap nhat feedback");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const updateUserRole = async (id: number, role: User["role"]) => {
    try {
      const updated = await adminService.updateUserRole(id, role);
      setUsers((items) => items.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      toast.success("Da cap nhat role");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <PageHeader title="Admin" description="Theo doi he thong, nguoi dung va phan hoi" />

      {loading || !dashboard ? (
        <Card><CardContent className="p-8">Dang tai admin dashboard...</CardContent></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Tong user", dashboard.totalUsers],
              ["User moi hom nay", dashboard.newUsersToday],
              ["Tong giao dich", dashboard.totalTransactions],
              ["Tong vi", dashboard.totalWallets],
              ["Feedback mo", dashboard.openFeedback],
              ["Login loi hom nay", dashboard.failedLoginsToday],
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
                  User gan day
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {users.map((item) => (
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
                  <CardTitle>Feedback gan day</CardTitle>
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
                      <SelectItem value="all">Tat ca</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chua co feedback.</p>
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
        </div>
      )}
    </div>
  );
}
