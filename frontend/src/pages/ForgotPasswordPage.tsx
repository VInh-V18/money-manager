import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/axios";

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => authService.forgotPassword(email);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestOtp();
      toast.success("Đã gửi OTP vào email của bạn");
      setStep("otp");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      await requestOtp();
      setCode("");
      toast.success("Đã gửi lại OTP vào email của bạn");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { resetToken } = await authService.verifyResetOtp(email, code);
      setResetToken(resetToken);
      setStep("password");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newPassword.length < 8 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      toast.error("Mật khẩu cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ email, resetToken, newPassword });
      toast.success("Đặt lại mật khẩu thành công. Hãy đăng nhập lại.");
      navigate("/signin");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-background to-indigo-50 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-md">
            <TrendingUp className="size-6" />
          </div>
          <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
          <CardDescription>
            {step === "email" && "Nhập email để nhận OTP đặt lại mật khẩu"}
            {step === "otp" && "Nhập mã OTP đã gửi đến email của bạn"}
            {step === "password" && "Tạo mật khẩu mới"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <form onSubmit={submitEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Gửi OTP
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={submitOtp} className="space-y-4">
              <div className="space-y-2">
                <Label>Mã OTP</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center tracking-[0.5em] text-lg font-bold"
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Xác nhận OTP
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={resendOtp} disabled={loading}>
                Gửi lại OTP
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                </p>
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Đặt lại mật khẩu
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm">
            <Link to="/signin" className="text-primary hover:underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
