import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/axios";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.verifyEmail(email, code);
      toast.success("Xác thực thành công! Hãy đăng nhập.");
      navigate("/signin");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return toast.error("Vui lòng nhập email");
    setResending(true);
    try {
      await authService.resendVerifyOtp(email);
      toast.success("Đã gửi lại OTP. Hãy kiểm tra email.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-background to-indigo-50 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-md">
            <TrendingUp className="size-6" />
          </div>
          <CardTitle className="text-2xl">Xác thực email</CardTitle>
          <CardDescription>
            Nhập mã OTP 6 chữ số đã gửi đến email của bạn.
            <br />
            <span className="text-xs">(Trong dev: OTP in ra console terminal server)</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="code">Mã OTP</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="text-center tracking-[0.5em] text-lg font-bold"
                required
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Xác nhận
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleResend}
              loading={resending}
            >
              Gửi lại OTP
            </Button>
            <p className="text-sm text-muted-foreground">
              <Link to="/signin" className="text-primary hover:underline">
                Quay lại đăng nhập
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
