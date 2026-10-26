import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import { Loader2, AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, isLoading, isInitialized, status, error, retryAuth, logout } = useAuth();

  // 1. Wait for session verification before making any routing decisions
  if (isLoading || !isInitialized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <p className="text-sm text-slate-400">Verifying session...</p>
      </div>
    );
  }

  // 2. Recoverable network or 5xx error state: preserve credentials and allow retry
  if (status === "error") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-400" />
        <h2 className="text-xl font-semibold">Session Verification Paused</h2>
        <p className="text-sm text-slate-400 text-center max-w-md">
          {error || "Unable to reach the server to verify your session. Please check your network connection."}
        </p>
        <div className="flex gap-3 pt-2">
          <Button onClick={retryAuth} variant="default" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
          <Button onClick={logout} variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </div>
    );
  }

  // 3. Not authenticated -> redirect to login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // 4. Role restriction
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
