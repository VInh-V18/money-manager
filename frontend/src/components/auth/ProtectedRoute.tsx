import { useEffect } from "react";
import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { Skeleton } from "@/components/ui/avatar";

export function ProtectedRoute() {
  const { accessToken, user, initialized, initAuth } = useAuthStore();

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

  // chua co access token -> chua dang nhap
  if (!accessToken) {
    return <Navigate to="/signin" replace />;
  }

  // co token nhung fetchMe loi -> coi nhu chua login
  if (initialized && !user) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}
