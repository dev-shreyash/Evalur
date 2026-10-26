import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  X,
  FileText,
  UserPlus,
  Database,
} from "lucide-react"
import logo from "@/assets/logo.png"
import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/feature/auth/hooks/useAuth"

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  
  const userRole = user?.role || "STAFF"
  const isAdmin = userRole === "ADMIN"
  const isManager = userRole === "MANAGER"

  // Dynamic menu based on role
  const getMenuItems = () => {
    if (isAdmin) {
      return [
        { name: "OverviewPage", icon: LayoutDashboard, url: "/admin/overview", badge: "" },
        { name: "Ingest Knowledge", icon: Database, url: "/admin/knowledge", badge: "" },
        { name: "Create Assessment", icon: ClipboardList, url: "/admin/assessments", badge: "" },
        { name: "Candidates", icon: Users, url: "/admin/candidates", badge: "" },
        { name: "Settings", icon: Settings, url: "/admin/settings", badge: "" },
      ]
    } else if (isManager) {
      return [
        { name: "Overview", icon: LayoutDashboard, url: "/manager", badge: "" },
        { name: "Assigned Assessments", icon: ClipboardList, url: "/manager/assessments", badge: "3" },
        { name: "My Candidates", icon: Users, url: "/manager/candidates", badge: "" },
        { name: "Team Performance", icon: BarChart3, url: "/manager/performance", badge: "" },
      ]
    }

    return [
      { name: "My Assessments", icon: ClipboardList, url: "/candidate", badge: "" },
      { name: "Profile", icon: Users, url: "/candidate/profile", badge: "" },
    ]
  }

  const menuItems = getMenuItems()

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={`
        fixed md:relative z-50 h-full bg-background border-r transition-all duration-300 ease-in-out
        ${isOpen ? 'left-0' : '-left-64 md:left-0'}
        w-64 flex-shrink-0
      `}>
        <div className="flex flex-col h-full">
          <SidebarHeader className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logo} className="w-9 h-9 rounded-lg" alt="Logo" />
                <div>
                  <h2 className="text-sm font-semibold">Evalur</h2>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? "Admin Portal" : isManager ? "Manager Portal" : "Candidate Portal"}
                  </p>
                </div>
              </div>
            
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SidebarHeader>

          <Separator />

          {/* Role Badge */}
          <div className="px-4 py-2">
            <Badge variant="outline" className="w-full justify-center gap-1">
              <span className="text-xs">Role:</span>
              <span className="font-semibold text-xs">
                {isAdmin ? "Administrator" : isManager ? "Manager" : "Candidate"}
              </span>
            </Badge>
          </div>

          <Separator />

          <SidebarContent className="px-2 py-3 flex-1">
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        onClick={onClose}
                        className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </div>

                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer with user info */}
          <div className="p-4 border-t mt-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || "user@example.com"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}