import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Map, BarChart3, Bell, Settings, Activity, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

const navItems = [
  { title: "Audit Radar", url: "/", icon: LayoutDashboard },
  { title: "Heatmap", url: "/heatmap", icon: Map },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Score Drivers", url: "/drivers", icon: FileSearch },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" className="text-primary/30" />
            <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
            <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="1.5" className="text-primary/60" />
            <circle cx="32" cy="32" r="3" className="fill-primary" />
            <line x1="32" y1="32" x2="32" y2="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary" />
            <line x1="32" y1="32" x2="54" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary/70" />
            <circle cx="54" cy="20" r="3" className="fill-red-500" />
            <circle cx="20" cy="22" r="2.5" className="fill-amber-500" />
            <circle cx="44" cy="42" r="2.5" className="fill-emerald-500" />
          </svg>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Audit Radar</h1>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">DTCC AI Hackathon</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/status"}>
                  <Link href="/status">
                    <Activity className="w-4 h-4" />
                    <span>System Status</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleTheme}
          className="w-full justify-start gap-2"
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
