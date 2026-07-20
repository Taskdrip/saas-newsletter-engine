import React from "react";
import { Link, useLocation } from "wouter";
import { useUser, UserButton } from "@clerk/react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { 
  LayoutDashboard, 
  Send, 
  Users, 
  ListOrdered,
  Filter,
  LayoutTemplate,
  GitBranch,
  FormInput,
  Globe,
  Settings,
  BarChart,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Send, label: "Campaigns", href: "/campaigns" },
  { icon: Users, label: "Subscribers", href: "/subscribers" },
  { icon: ListOrdered, label: "Lists", href: "/lists" },
  { icon: Filter, label: "Segments", href: "/segments" },
  { icon: LayoutTemplate, label: "Templates", href: "/templates" },
  { icon: GitBranch, label: "Automations", href: "/automations" },
  { icon: FormInput, label: "Forms", href: "/forms" },
  { icon: Globe, label: "Websites", href: "/websites" },
  { icon: BarChart, label: "Analytics", href: "/analytics" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { workspaces, activeWorkspace, setWorkspaceId, isLoading } = useWorkspace();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar flex-shrink-0 flex flex-col border-r border-sidebar-border h-full">
        {/* Workspace Selector */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border relative">
          <button 
            className="flex-1 flex items-center justify-between text-sidebar-foreground hover:bg-sidebar-accent p-2 rounded-md transition-colors"
            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-6 h-6 bg-sidebar-primary rounded flex items-center justify-center text-sidebar-primary-foreground font-bold text-xs">
                {activeWorkspace?.name.charAt(0) || "W"}
              </div>
              <span className="font-semibold text-sm truncate">{isLoading ? "Loading..." : activeWorkspace?.name || "No Workspace"}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-sidebar-foreground/50" />
          </button>
          
          {/* Workspace Dropdown */}
          {isWorkspaceMenuOpen && (
            <div className="absolute top-14 left-4 right-4 bg-popover border border-popover-border rounded-md shadow-lg z-50 p-1">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center justify-between"
                  onClick={() => {
                    setWorkspaceId(ws.id);
                    setIsWorkspaceMenuOpen(false);
                  }}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === activeWorkspace?.id && <span className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Settings & User */}
        <div className="p-4 border-t border-sidebar-border flex flex-col gap-2">
          <Link href="/settings" className="block">
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location.startsWith('/settings')
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Settings className="w-4 h-4" />
              Settings
            </div>
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.fullName || "User"}</span>
              <span className="text-xs text-sidebar-foreground/50 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
