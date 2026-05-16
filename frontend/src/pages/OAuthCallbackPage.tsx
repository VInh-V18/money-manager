import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/useAuthStore";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const error = searchParams.get("error");

    if (error || !accessToken) {
      toast.error(error || "Đăng nhập bằng mạng xã hội không thành công");
      navigate("/signin", { replace: true });
      return;
    }

    const completeLogin = async () => {
      const auth = useAuthStore.getState();
      auth.setAccessToken(accessToken);
      await auth.fetchMe();

      if (!useAuthStore.getState().user) {
        toast.error("Không lấy được thông tin tài khoản");
        navigate("/signin", { replace: true });
        return;
      }

      toast.success("Đăng nhập thành công");
      navigate("/", { replace: true });
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
