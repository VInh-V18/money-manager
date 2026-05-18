import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { Skeleton } from "@/components/ui/avatar";

export function ProtectedRoute() {
  const { accessToken, user, initialized, initAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) initAuth();
  }, [initialized, initAuth]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!accessToken || (initialized && !user)) {
    // Lưu trang hiện tại để sau login quay lại
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
