import { Menu, User, Settings, LogOut, Building } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import { toast } from "sonner";

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const userRole = user?.role || "STAFF";
  const isAdmin = userRole === "ADMIN";
  const isManager = userRole === "MANAGER";

  const getRoleLabel = () => {
    if (isAdmin) return "Administrator";
    if (isManager) return "Manager";
    if (userRole === "CANDIDATE") return "Candidate";
    return "Staff Member";
  };

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    navigate("/auth/login", { replace: true });
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 flex items-center justify-between shrink-0 z-20">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-slate-600 hover:text-slate-900"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:block">
          <p className="text-xs text-slate-500 font-medium">
            Signed in as <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name || "User"}</span>
          </p>
        </div>
      </div>

      {/* Right: User Menu */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {getRoleLabel()}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-700">
                <AvatarFallback className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-lg p-1">
            <DropdownMenuLabel className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.name || "User"}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email || "user@organization.com"}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

            {isAdmin && (
              <DropdownMenuItem asChild className="text-xs cursor-pointer px-3 py-2 focus:bg-slate-100 dark:focus:bg-slate-800">
                <Link to="/admin/settings" className="flex items-center gap-2 w-full text-slate-700 dark:text-slate-200">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span>Organization Settings</span>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs cursor-pointer px-3 py-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/40 flex items-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
