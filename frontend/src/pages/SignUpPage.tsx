import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/useAuthStore";

const schema = z.object({
  username: z.string().min(3, "Tối thiểu 3 ký tự").regex(/^[a-zA-Z0-9_]+$/, "Chỉ gồm chữ, số, gạch dưới"),
  email: z.string().email("Email không hợp lệ"),
  displayName: z.string().min(1, "Vui lòng nhập họ tên"),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .regex(/[a-z]/, "Cần có chữ thường")
    .regex(/[A-Z]/, "Cần có chữ hoa")
    .regex(/\d/, "Cần có số")
    .regex(/[^A-Za-z0-9]/, "Cần có ký tự đặc biệt"),
});
type FormData = z.infer<typeof schema>;

export default function SignUpPage() {
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const ok = await signUp(data);
    if (ok) navigate("/signin");
  };

  return (
    <div className="flex min-h-dvh items-start justify-center overflow-y-auto bg-gradient-to-br from-blue-50 via-background to-indigo-50 px-4 py-6 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 sm:items-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-md">
            <TrendingUp className="size-6" />
          </div>
          <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
          <CardDescription>Bắt đầu quản lý tài chính của bạn ngay hôm nay</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Họ tên</Label>
              <Input id="displayName" {...register("displayName")} placeholder="Nguyễn Văn A" />
              <p className="min-h-4 text-xs text-destructive" aria-live="polite">
                {errors.displayName?.message}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" {...register("username")} placeholder="nguyenvana" />
              <p className="min-h-4 text-xs text-destructive" aria-live="polite">
                {errors.username?.message}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="email@example.com" />
              <p className="min-h-4 text-xs text-destructive" aria-live="polite">
                {errors.email?.message}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" {...register("password")} placeholder="********" />
              <p className="text-xs text-muted-foreground">
                Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
              </p>
              <p className="min-h-4 text-xs text-destructive" aria-live="polite">
                {errors.password?.message}
              </p>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Đăng ký
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link to="/signin" className="text-primary font-medium hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
