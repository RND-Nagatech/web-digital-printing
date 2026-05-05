import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

export const ProtectedRoute = ({ children, permission }: { children: ReactNode; permission?: string }) => {
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const location = useLocation();

  useEffect(() => { if (!user) hydrate(); }, [user, hydrate]);

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (permission && !hasPermission(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
