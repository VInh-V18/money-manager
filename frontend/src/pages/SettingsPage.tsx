import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Camera, History, LogOut, MonitorSmartphone, Moon, ShieldCheck, Sun } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage, Separator } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { authService } from "@/services/authService";
import { notificationService } from "@/services/moduleServices";
import { getErrorMessage } from "@/lib/axios";
import { getBackendAssetUrl } from "@/lib/env";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn, formatDateTime } from "@/lib/utils";
import type { ActivityLog, AuthSession, LoginHistory, NotificationPreference, NotificationType } from "@/types";

const profileSchema = z.object({
  displayName: z.string().min(1),
  bio: z.string().optional(),
  phone: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Mật khẩu mới tối thiểu 8 ký tự")
    .regex(/[a-z]/, "Cần có chữ thường")
    .regex(/[A-Z]/, "Cần có chữ hoa")
    .regex(/\d/, "Cần có số")
    .regex(/[^A-Za-z0-9]/, "Cần có ký tự đặc biệt"),
});
type PasswordForm = z.infer<typeof passwordSchema>;

const notificationLabels: Record<NotificationType, string> = {
  budget_warning: "Cảnh báo gần vượt ngân sách",
  budget_exceeded: "Vượt ngân sách",
  low_balance: "Số dư ví thấp",
  fixed_expense_due: "Chi cố định đến hạn",
  fixed_expense_generated: "Chi cố định đã tạo",
  abnormal_spending: "Chi tiêu bất thường",
  goal_progress: "Tiến độ mục tiêu",
  debt_due: "Nợ đến hạn",
  remind_log: "Nhắc nhập giao dịch",
  system: "Thông báo hệ thống",
};

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loginStatusFilter, setLoginStatusFilter] = useState<LoginHistory["status"] | "all">("all");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreference | null>(null);
  const [notificationSaving, setNotificationSaving] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "", bio: "", phone: "" },
  });
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        displayName: user.displayName,
        bio: user.bio || "",
        phone: user.phone || "",
      });
    }
  }, [user, profileForm]);

  const loadSecurity = async () => {
    try {
      setSecurityLoading(true);
      const [sessionItems, history, activities] = await Promise.all([
        authService.sessions(),
        authService.loginHistory(1, 8, loginStatusFilter === "all" ? undefined : loginStatusFilter),
        authService.activityLogs(1, 8),
      ]);
      setSessions(sessionItems);
      setLoginHistory(history.items);
      setActivityLogs(activities.items);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không tải được thông tin bảo mật"));
    } finally {
      setSecurityLoading(false);
    }
  };

  useEffect(() => {
    if (user) void loadSecurity();
  }, [user, loginStatusFilter]);

  useEffect(() => {
    if (!user) return;
    notificationService
      .preferences()
      .then(setNotificationPrefs)
      .catch((err) => toast.error(getErrorMessage(err, "Không tải được cài đặt thông báo")));
  }, [user]);

  const saveProfile = async (data: ProfileForm) => {
    try {
      const updated = await authService.updateProfile(data);
      setUser(updated);
      toast.success("Đã cập nhật hồ sơ");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const changePassword = async (data: PasswordForm) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      toast.success("Đổi mật khẩu thành công. Hãy đăng nhập lại.");
      passwordForm.reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB");
      return;
    }
    setUploading(true);
    try {
      const { avatarUrl } = await authService.uploadAvatar(file);
      if (user) setUser({ ...user, avatarUrl });
      toast.success("Đã cập nhật ảnh đại diện");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const revokeSession = async (session: AuthSession) => {
    try {
      const data = await authService.revokeSession(session.id);
      toast.success("Đã đăng xuất thiết bị");
      if (data.revokedCurrent) {
        await useAuthStore.getState().signOut();
        return;
      }
      await loadSecurity();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const revokeOthers = async () => {
    try {
      const data = await authService.revokeOtherSessions();
      toast.success(`Đã đăng xuất ${data.revokedCount} thiết bị khác`);
      await loadSecurity();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const updateNotificationPrefs = async (patch: Partial<NotificationPreference>) => {
    if (!notificationPrefs) return;
    const next = {
      ...notificationPrefs,
      ...patch,
      typePreferences: {
        ...notificationPrefs.typePreferences,
        ...(patch.typePreferences || {}),
      },
    };
    setNotificationPrefs(next);
    setNotificationSaving(true);
    try {
      const saved = await notificationService.updatePreferences({
        inAppEnabled: next.inAppEnabled,
        emailEnabled: next.emailEnabled,
        typePreferences: next.typePreferences,
      });
      setNotificationPrefs(saved);
      toast.success("Đã cập nhật cài đặt thông báo");
    } catch (err) {
      setNotificationPrefs(notificationPrefs);
      toast.error(getErrorMessage(err, "Không lưu được cài đặt thông báo"));
    } finally {
      setNotificationSaving(false);
    }
  };

  if (!user) return null;

  const initials = (user.displayName || user.username)
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarSrc = getBackendAssetUrl(user.avatarUrl);

  return (
    <div>
      <PageHeader title="Cài đặt" description="Quản lý hồ sơ và tuỳ chỉnh giao diện" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="size-20">
                  {avatarSrc && <AvatarImage src={avatarSrc} alt={user.displayName} />}
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="absolute -right-2 -bottom-2 size-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                >
                  <Camera className="size-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="font-semibold">{user.displayName}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Separator />

            <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
              <div className="space-y-2">
                <Label>Họ tên</Label>
                <Input {...profileForm.register("displayName")} />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input {...profileForm.register("phone")} placeholder="0901234567" />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea {...profileForm.register("bio")} rows={3} placeholder="Giới thiệu bản thân..." />
              </div>
              <Button type="submit" loading={profileForm.formState.isSubmitting}>
                Lưu hồ sơ
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Giao diện</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition",
                      theme === t ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    {t === "light" ? <Sun className="size-6" /> : <Moon className="size-6" />}
                    <span className="text-sm font-medium">
                      {t === "light" ? "Sáng" : "Tối"}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Mật khẩu hiện tại</Label>
                  <Input type="password" {...passwordForm.register("currentPassword")} />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Mật khẩu mới</Label>
                  <Input type="password" {...passwordForm.register("newPassword")} />
                  <p className="text-xs text-muted-foreground">
                    Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                  </p>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <Button type="submit" variant="outline" loading={passwordForm.formState.isSubmitting}>
                  Đổi mật khẩu
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Cài đặt thông báo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!notificationPrefs ? (
            <p className="text-sm text-muted-foreground">Đang tải cài đặt thông báo...</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span>
                    <span className="block text-sm font-medium">Thông báo trong app</span>
                    <span className="text-xs text-muted-foreground">Hiển thị tại trang Thông báo</span>
                  </span>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={notificationPrefs.inAppEnabled}
                    disabled={notificationSaving}
                    onChange={(event) => updateNotificationPrefs({ inAppEnabled: event.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span>
                    <span className="block text-sm font-medium">Gửi qua email</span>
                    <span className="text-xs text-muted-foreground">Dùng SMTP đã cấu hình trên backend</span>
                  </span>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={notificationPrefs.emailEnabled}
                    disabled={notificationSaving}
                    onChange={(event) => updateNotificationPrefs({ emailEnabled: event.target.checked })}
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(notificationLabels) as NotificationType[]).map((type) => (
                  <label key={type} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                    <span className="text-sm">{notificationLabels[type]}</span>
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={notificationPrefs.typePreferences[type] !== false}
                      disabled={notificationSaving}
                      onChange={(event) =>
                        updateNotificationPrefs({
                          typePreferences: {
                            ...notificationPrefs.typePreferences,
                            [type]: event.target.checked,
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="size-5" />
              Thiết bị đang đăng nhập
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={revokeOthers} disabled={securityLoading || sessions.length <= 1}>
                <LogOut className="size-4" />
                Đăng xuất thiết bị khác
              </Button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu phiên đăng nhập.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {session.deviceName || "Thiết bị"} · {session.browser || "Unknown"}
                          {session.isCurrent && (
                            <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">Hiện tại</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.os || "Unknown OS"} · {session.ipAddress || "Không rõ IP"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Hoạt động cuối: {formatDateTime(session.lastActiveAt || session.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={session.isCurrent ? "outline" : "destructive"}
                        onClick={() => revokeSession(session)}
                      >
                        Đăng xuất
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5" />
              Lịch sử đăng nhập
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select
              value={loginStatusFilter}
              onValueChange={(value) => setLoginStatusFilter(value as LoginHistory["status"] | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="SUCCESS">Đăng nhập thành công</SelectItem>
                <SelectItem value="FAILED_PASSWORD">Sai mật khẩu</SelectItem>
                <SelectItem value="FAILED_USER">Không tìm thấy tài khoản</SelectItem>
                <SelectItem value="LOCKED">Tài khoản bị khóa</SelectItem>
                <SelectItem value="OAUTH_SUCCESS">OAuth thành công</SelectItem>
                <SelectItem value="OAUTH_FAILED">OAuth thất bại</SelectItem>
              </SelectContent>
            </Select>
            {loginHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có lịch sử đăng nhập.</p>
            ) : (
              loginHistory.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <ShieldCheck className={cn(
                    "mt-0.5 size-4",
                    item.status.includes("SUCCESS") ? "text-success" : "text-destructive"
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.browser || "Unknown"} · {item.os || "Unknown"} · {item.ipAddress || "Không rõ IP"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Nhật ký hoạt động gần đây
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activityLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có hoạt động nào được ghi nhận.</p>
          ) : (
            activityLogs.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {item.action} · {item.entityType}
                    {item.entityId ? <span className="text-muted-foreground"> #{item.entityId}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.ipAddress || "Không rõ IP"} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
