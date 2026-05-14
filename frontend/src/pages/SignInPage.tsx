import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp, Eye, EyeOff, Chrome, Github, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/useAuthStore";
import { authService, type OAuthProvider } from "@/services/authService";

const schema = z.object({
  identifier: z.string().min(1, "Vui lòng nhập email hoặc username"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
type FormData = z.infer<typeof schema>;

export default function SignInPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "demo@money.local", password: "Demo@1234" },
  });

  if (accessToken) return <Navigate to="/" replace />;

  const onSubmit = async (data: FormData) => {
    const ok = await signIn(data.identifier, data.password);
    if (ok) navigate("/");
  };

  const handleOAuthLogin = (provider: OAuthProvider) => {
    window.location.href = authService.oauthUrl(provider);
  };

  return (
    <div className="flex min-h-dvh items-start justify-center overflow-y-auto bg-gradient-to-br from-blue-50 via-background to-indigo-50 px-4 py-6 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 sm:items-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-md">
            <TrendingUp className="size-6" />
          </div>
          <CardTitle className="text-2xl">Money Manager</CardTitle>
          <CardDescription>Đăng nhập để quản lý chi tiêu của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email hoặc Username</Label>
              <Input id="identifier" {...register("identifier")} placeholder="demo@money.local" />
              <p className="min-h-4 text-xs text-destructive" aria-live="polite">
                {errors.identifier?.message}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  {...register("password")}
                  placeholder="********"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1"
                  onClick={() => setShowPwd((v) => !v)}
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="min-h-4 text-xs text-destructive" aria-live="polite">
                {errors.password?.message}
              </p>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Đăng nhập
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">Hoặc đăng nhập bằng</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin("google")}
            >
              <Chrome className="mr-2 size-4" />
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin("facebook")}
            >
              <Globe2 className="mr-2 size-4" />
              Facebook
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin("github")}
            >
              <Github className="mr-2 size-4" />
              GitHub
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Đăng ký
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
