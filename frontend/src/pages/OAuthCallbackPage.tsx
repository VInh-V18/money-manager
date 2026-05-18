import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/lib/axios";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const from = searchParams.get("from") || "/";

    if (error || !code) {
      toast.error(error || "Đăng nhập bằng mạng xã hội không thành công");
      navigate("/signin", { replace: true });
      return;
    }

    const completeLogin = async () => {
      try {
        // Exchange the one-time code for an access token.
        // The refresh token is set as an httpOnly cookie by the server.
        const res = await api.post<{ data: { accessToken: string } }>("/auth/oauth/exchange", { code });
        const accessToken = res.data?.data?.accessToken;

        if (!accessToken) {
          toast.error("Không lấy được token đăng nhập");
          navigate("/signin", { replace: true });
          return;
        }

        const auth = useAuthStore.getState();
        auth.setAccessToken(accessToken);
        await auth.fetchMe();

        if (!useAuthStore.getState().user) {
          toast.error("Không lấy được thông tin tài khoản");
          navigate("/signin", { replace: true });
          return;
        }

        toast.success("Đăng nhập thành công");
        navigate(from, { replace: true });
      } catch {
        toast.error("Đăng nhập bằng mạng xã hội không thành công");
        navigate("/signin", { replace: true });
      }
    };

    void completeLogin();
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin" />
        Đang hoàn tất đăng nhập...
      </div>
    </div>
  );
}
