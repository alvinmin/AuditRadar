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
import { LayoutDashboard, BarChart3, Bell, Settings, Activity, FileSearch, Crosshair, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import auditRadarLogo from "@assets/Audit_Radar_Logo_1771881831743.png";

const navItems = [
  { title: "Audit Radar", url: "/", icon: LayoutDashboard },
  { title: "Risk Quadrant", url: "/quadrant", icon: Crosshair },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Score Drivers", url: "/drivers", icon: FileSearch },
  { title: "Recommendations", url: "/recommendations", icon: ListChecks },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <img src={auditRadarLogo} alt="Audit Radar" className="w-9 h-9 shrink-0 rounded" />
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
