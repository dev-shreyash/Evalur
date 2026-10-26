import { Navigate } from "react-router-dom";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function RoleRedirect() {
  const { user, isLoading, isInitialized } = useAuth();

  // Wait for verified session before making role-based redirect decisions
  if (isLoading || !isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  const role = user.role?.toUpperCase();

  if (role === "ADMIN") return <Navigate to="/admin" replace />;
  if (role === "MANAGER") return <Navigate to="/manager" replace />;
  if (role === "STAFF") return <Navigate to="/staff" replace />;
  if (role === "CANDIDATE") return <Navigate to="/candidate" replace />;

  return <Navigate to="/unauthorized" replace />;
}
