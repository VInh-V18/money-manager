import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage, Separator } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/axios";
import { getBackendAssetUrl } from "@/lib/env";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  displayName: z.string().min(1),
  bio: z.string().optional(),
  phone: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
    </div>
  );
}
