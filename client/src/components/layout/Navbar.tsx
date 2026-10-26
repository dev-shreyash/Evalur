import {Menu } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/feature/auth/hooks/useAuth"
import { toast } from "sonner"

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
 
  
  const userRole = user?.role || "STAFF"
  const isAdmin = userRole === "ADMIN"
  const isManager = userRole === "MANAGER"
  
  // Role-based welcome message
  const getWelcomeMessage = () => {
    if (isAdmin) return "Welcome back, Admin"
    if (isManager) return "Welcome back, Manager"
    if (userRole === "STAFF") return "Welcome back, Staff"
    if (userRole === "CANDIDATE") return "Welcome back, Candidate"
    return "Welcome"
  }

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/auth/login", { replace: true });
  };
  return (
    <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-background sticky top-0 z-30">
      {/* Left section with menu button and welcome text */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div>
          <p className="text-sm text-muted-foreground">{getWelcomeMessage()},</p>
          <h1 className="text-lg font-semibold">{user?.name || "User"}</h1>
        </div>
      </div>
        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-muted rounded-lg px-2 py-1 transition-colors">
              <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? "Administrator" : isManager ? "Manager" : "Candidate"}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">Profile Settings</Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/organization-settings" className="cursor-pointer">Organization Settings</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-500 cursor-pointer"
              onClick={handleLogout}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
  
  )
}