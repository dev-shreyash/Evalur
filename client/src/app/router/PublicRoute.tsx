import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import { Loader2 } from "lucide-react";

const PublicRoute = () => {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  // Wait for initial session verification to prevent flashing login before redirecting
  if (isLoading || !isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
