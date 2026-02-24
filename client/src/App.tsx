import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import QuadrantPage from "@/pages/quadrant-page";
import AnalyticsPage from "@/pages/analytics-page";
import AlertsPage from "@/pages/alerts-page";
import DriversPage from "@/pages/drivers-page";
import StatusPage from "@/pages/status-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/quadrant" component={QuadrantPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/drivers" component={DriversPage} />
      <Route path="/status" component={StatusPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center gap-2 p-2 border-b h-12 shrink-0">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground font-mono">DTCC Audit Radar v1.0</span>
                  </div>
                </header>
                <main className="flex-1 overflow-hidden">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
