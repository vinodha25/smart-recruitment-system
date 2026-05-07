import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  Search,
  Calendar,
  Brain,
  GraduationCap,
  TrendingUp,
  UsersRound,
  DollarSign,
  Compass,
  Settings,
  LogOut,
  ChevronLeft,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Briefcase, label: "Jobs", href: "/jobs" },
  { icon: FileText, label: "Resumes", href: "/resumes" },
  { icon: Users, label: "Candidates", href: "/candidates" },
  { icon: Search, label: "Screening", href: "/screening" },
  { icon: CheckCircle2, label: "Evaluated", href: "/evaluated" },
  { icon: AlertOctagon, label: "Rejected", href: "/rejected" },
  { icon: Calendar, label: "Interviews", href: "/interviews" },
  { icon: Users, label: "Teams", href: "/teams" },
];

const aiModules = [
  { icon: TrendingUp, label: "Success Predictor", href: "/ai/predictor" },
  { icon: UsersRound, label: "Team Compatibility", href: "/ai/compatibility" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="gradient-ai rounded-lg p-1.5">
                <Sparkles className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-sidebar-foreground">
                HireAI
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Main
              </span>
            )}
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  location.pathname === item.href
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>

          <Separator className="my-4 bg-sidebar-border" />

          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50 flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-sidebar-primary" />
                AI Modules
              </span>
            )}
            {aiModules.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  location.pathname === item.href
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <Settings className="h-5 w-5" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all">
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
