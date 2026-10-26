import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  X,
  FileText,
  Database,
  Building2,
  FolderGit2
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const userRole = user?.role || "STAFF";
  const isAdmin = userRole === "ADMIN";
  const isManager = userRole === "MANAGER";

  // Dynamic menu based on role
  const getMenuItems = () => {
    if (isAdmin) {
      return [
        { name: "System Overview", icon: LayoutDashboard, url: "/admin/overview" },
        { name: "Assessments", icon: ClipboardList, url: "/admin/assessments" },
        { name: "Candidates & Cohorts", icon: Users, url: "/admin/candidates" },
        { name: "Knowledge Base", icon: Database, url: "/admin/knowledge" },
        { name: "Settings", icon: Settings, url: "/admin/settings" },
      ];
    } else if (isManager) {
      return [
        { name: "Overview", icon: LayoutDashboard, url: "/manager" },
        { name: "Assessments", icon: ClipboardList, url: "/manager/assessments" },
        { name: "Candidates & Cohorts", icon: Users, url: "/manager/candidates" },
      ];
    }

    return [
      { name: "My Assessments", icon: ClipboardList, url: "/candidate" },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header Branding */}
          <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-5 flex items-center justify-between shrink-0">
            <Link to={isAdmin ? "/admin/overview" : isManager ? "/manager" : "/candidate"} className="flex items-center gap-2.5">
              <img src={logo} className="w-7 h-7 rounded-md object-contain" alt="Evalur Logo" />
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none block">
                  Evalur
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-tight block">
                  Technical Assessments
                </span>
              </div>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 text-slate-500 hover:text-slate-900"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </div>

            {menuItems.map((item) => {
              const isActive = location.pathname === item.url || (item.url !== "/admin" && location.pathname.startsWith(item.url + "/"));

              return (
                <Link
                  key={item.name}
                  to={item.url}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Context Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate leading-none">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-slate-500 truncate mt-1">
                  {user?.email || "user@organization.com"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
